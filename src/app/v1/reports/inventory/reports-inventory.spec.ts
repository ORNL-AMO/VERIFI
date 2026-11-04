import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { setupReportInventory } from '@app/v1/reports/testing/report-inventory-test-setup';
import { ReportsInventoryComponent } from '@app/v1/reports/inventory/reports-inventory.component';

describe('ReportsInventoryComponent', () => {
  async function setup() {
    const context = await setupReportInventory(); const fixture = TestBed.createComponent(ReportsInventoryComponent); fixture.detectChanges();
    const dashboard = fixture.componentInstance;
    return { ...context, fixture, dashboard, lifecycle: dashboard.lifecycle };
  }
  it('combines account and facility reports and defaults to simple, account-first cards', async () => {
    const { fixture, dashboard } = await setup();
    expect(dashboard.entries()).toHaveLength(2); expect(dashboard.filteredEntries().map(entry => entry.scope)).toEqual(['account', 'facility']);
    expect(fixture.nativeElement.querySelectorAll('.portfolio-inventory app-inventory-tile')).toHaveLength(2);
    expect(dashboard.inventory.detail()).toBe('simple'); expect(fixture.nativeElement.textContent).toContain('Report content pending');
    dashboard.filtersForm.controls.scope.setValue('facility'); fixture.detectChanges(); expect(dashboard.filteredEntries()).toHaveLength(1);
    expect(dashboard.filteredEntries()[0].scope).toBe('facility');
  });
  it('uses the sole facility for creation without selecting it in the workspace', async () => {
    const { dashboard, lifecycle, store, facilityActions } = await setup();
    const original = store.selectedFacility(); dashboard.openCreate(); lifecycle.selectScope('facility');
    expect(lifecycle.canSave()).toBe(false);
    lifecycle.selectType('analysis'); expect(lifecycle.canSave()).toBe(true);
    await lifecycle.submit(); expect(facilityActions.create).toHaveBeenCalledWith('facility-a', 'Analysis report', 'analysis'); expect(store.selectedFacility()).toBe(original);
  });
  it('renames a facility report through its explicit owner and keeps owner/type fixed in the editor', async () => {
    const { dashboard, fixture, lifecycle, facilityActions } = await setup();
    const entry = dashboard.entries().find(item => item.scope === 'facility')!;
    dashboard.requestAction({ guid: entry.key, action: 'rename' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#report-level')).toBeNull(); expect(fixture.nativeElement.querySelector('#report-type')).toBeNull();
    lifecycle.form.controls.name.setValue('Renamed facility report'); expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    await lifecycle.submit(); expect(facilityActions.updateName).toHaveBeenCalledWith('facility-a', 'report-a', 'Renamed facility report');
  });
  for (const scope of ['account', 'facility'] as const) {
    it.each([undefined, null, 'unknown-report'])(`renames a saved ${scope} report with catalog type %s without changing its type`, async type => {
      const { dashboard, fixture, lifecycle, store, accountActions, facilityActions } = await setup();
      const snapshot = store.snapshot()!;
      store.publish({ ...snapshot,
        accountReports: scope === 'account' ? snapshot.accountReports.map(report => ({ ...report, reportType: type as typeof report.reportType })) : snapshot.accountReports,
        facilityReports: scope === 'facility' ? snapshot.facilityReports.map(report => ({ ...report, facilityReportType: type as typeof report.facilityReportType })) : snapshot.facilityReports
      }); fixture.detectChanges();
      const entry = dashboard.entries().find(item => item.scope === scope)!;
      expect(entry.typeLabel).toBe('Unknown report type');
      dashboard.requestAction({ guid: entry.key, action: 'rename' }); fixture.detectChanges();
      const name = fixture.nativeElement.querySelector('#report-name') as HTMLInputElement;
      name.value = 'Renamed legacy report'; name.dispatchEvent(new Event('input')); fixture.detectChanges();
      const save = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(lifecycle.availabilityError()).toBeUndefined(); expect(save.disabled).toBe(false);
      await lifecycle.submit();
      if (scope === 'account') {
        expect(accountActions.updateName).toHaveBeenCalledWith('account-report', 'Renamed legacy report');
        expect(store.accountReports()[0].reportType).toBe(type);
      } else {
        expect(facilityActions.updateName).toHaveBeenCalledWith('facility-a', 'report-a', 'Renamed legacy report');
        expect(store.facilityReports()[0].facilityReportType).toBe(type);
      }
      expect(accountActions.create).not.toHaveBeenCalled(); expect(facilityActions.create).not.toHaveBeenCalled();
    });

    it(`keeps Other Impacts availability checks when renaming a saved ${scope} report`, async () => {
      const { dashboard, fixture, lifecycle, store, accountActions, facilityActions } = await setup();
      const snapshot = store.snapshot()!;
      store.publish({ ...snapshot,
        accountReports: scope === 'account' ? snapshot.accountReports.map(report => ({ ...report, reportType: 'accountEmissionFactors' as const })) : snapshot.accountReports,
        facilityReports: scope === 'facility' ? snapshot.facilityReports.map(report => ({ ...report, facilityReportType: 'emissionFactors' as const })) : snapshot.facilityReports
      }); fixture.detectChanges();
      const entry = dashboard.entries().find(item => item.scope === scope)!;
      lifecycle.rename(entry); lifecycle.form.controls.name.setValue('Renamed impacts report');
      store.publish({ ...store.snapshot()!, account: { ...snapshot.account, displayEmissions: false } }); fixture.detectChanges();
      expect(lifecycle.availabilityError()).toBe('Enable Other Impacts in Account Goals to access this report type.');
      expect(lifecycle.canSave()).toBe(false); await lifecycle.submit();
      expect(accountActions.updateName).not.toHaveBeenCalled(); expect(facilityActions.updateName).not.toHaveBeenCalled();
    });

    it(`still rejects unknown catalog types when creating a ${scope} report`, async () => {
      const { dashboard, lifecycle, accountActions, facilityActions } = await setup();
      dashboard.openCreate(); lifecycle.selectScope(scope); lifecycle.selectType('analysis');
      lifecycle.form.controls.type.setValue('unknown-report' as typeof lifecycle.form.controls.type.value);
      expect(lifecycle.canSave()).toBe(false); await lifecycle.submit();
      expect(accountActions.create).not.toHaveBeenCalled(); expect(facilityActions.create).not.toHaveBeenCalled();
    });
  }
  it('keeps facility ownership checks when renaming a saved report', async () => {
    const { dashboard, fixture, lifecycle, store, facilityActions } = await setup();
    const entry = dashboard.entries().find(item => item.scope === 'facility')!;
    lifecycle.rename(entry); lifecycle.form.controls.name.setValue('Renamed orphaned report');
    store.publish({ ...store.snapshot()!, facilities: [] }); fixture.detectChanges();
    expect(lifecycle.canSave()).toBe(false); await lifecycle.submit();
    expect(facilityActions.updateName).not.toHaveBeenCalled();
  });
  it('filters and sorts before pagination and clamps after deletion', async () => {
    const { dashboard, store, fixture } = await setup();
    const source = store.snapshot()!;
    store.publish({ ...source, accountReports: Array.from({ length: 26 }, (_, i) => ({ ...source.accountReports[0], id: i + 20, guid: `report-${i}`, name: `Account ${String(i).padStart(2, '0')}` })) });
    fixture.detectChanges(); expect(dashboard.inventory.visibleTiles()).toHaveLength(24); dashboard.inventory.selectPage(1);
    expect(dashboard.inventory.visibleTiles()).toHaveLength(3);
    dashboard.filtersForm.controls.scope.setValue('facility'); fixture.detectChanges(); expect(dashboard.inventory.page()).toBe(0); expect(dashboard.inventory.visibleTiles()).toHaveLength(1);
  });
});

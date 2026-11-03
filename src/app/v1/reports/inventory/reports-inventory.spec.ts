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
  it('filters and sorts before pagination and clamps after deletion', async () => {
    const { dashboard, store, fixture } = await setup();
    const source = store.snapshot()!;
    store.publish({ ...source, accountReports: Array.from({ length: 26 }, (_, i) => ({ ...source.accountReports[0], id: i + 20, guid: `report-${i}`, name: `Account ${String(i).padStart(2, '0')}` })) });
    fixture.detectChanges(); expect(dashboard.inventory.visibleTiles()).toHaveLength(24); dashboard.inventory.selectPage(1);
    expect(dashboard.inventory.visibleTiles()).toHaveLength(3);
    dashboard.filtersForm.controls.scope.setValue('facility'); fixture.detectChanges(); expect(dashboard.inventory.page()).toBe(0); expect(dashboard.inventory.visibleTiles()).toHaveLength(1);
  });
});

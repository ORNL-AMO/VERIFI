import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { TestBed } from '@angular/core/testing';
import { reportFacility, reportFixture } from '@app/v1/reports/facility/testing/report-test-fixtures';
import { BrowseStateService } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { setupReportInventory } from '../testing/report-inventory-test-setup';
import { ReportsInventoryComponent } from './reports-inventory.component';

describe('report browse state', () => {
  it('excludes account reports under a facility and normalizes incompatible remembered controls', async () => {
    const { store, navigation } = await setupReportInventory();
    store.publish({ ...store.snapshot()!, facilities: [...store.facilities(), { ...reportFacility, guid: 'facility-b' }],
      facilityReports: [reportFixture(), reportFixture({ guid: 'other-report', facilityId: 'facility-b' })] });
    const fixture = TestBed.createComponent(ReportsInventoryComponent); fixture.detectChanges();
    const host = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('h1')?.textContent.trim()).toBe('Reports');
    host.filtersForm.patchValue({ scope: 'account', type: 'account:analysis' }); fixture.detectChanges();
    navigation.inventoryFacilityGuid.set('facility-a'); fixture.detectChanges();
    expect(host.filteredEntries().map(entry => entry.report.guid)).toEqual(['report-a']);
    expect(host.filtersForm.controls.type.value).toBe('all');
    expect(host.filters().sort).toBe('attention');
    expect(host.typeOptions().every(option => option.value.startsWith('facility:'))).toBe(true);
    expect(fixture.nativeElement.querySelector('[formControlName="scope"]')).toBeNull();
    host.clearFilters(); fixture.detectChanges();
    expect(navigation.inventoryFacilityGuid()).toBe('facility-a');
    navigation.inventoryFacilityGuid.set('facility-b'); fixture.detectChanges();
    expect(host.filteredEntries().map(entry => entry.report.guid)).toEqual(['other-report']);
    navigation.inventoryFacilityGuid.set(undefined); fixture.detectChanges();
    expect(host.entries()).toHaveLength(3);
  });

  it('starts named-scope creation with fixed facility ownership', async () => {
    const { navigation } = await setupReportInventory();
    navigation.inventoryFacilityGuid.set('facility-a');
    const fixture = TestBed.createComponent(ReportsInventoryComponent); fixture.detectChanges();
    const host = fixture.componentInstance;
    host.openCreate(); fixture.detectChanges();
    expect(host.lifecycle.form.controls.scope.value).toBe('facility');
    expect(host.lifecycle.form.controls.facilityGuid.value).toBe('facility-a');
    expect(host.lifecycle.editor()?.fixedFacility).toBe('facility-a');
    expect(fixture.nativeElement.querySelector('#report-facility')).toBeNull();
    host.lifecycle.form.controls.scope.setValue('account'); fixture.detectChanges();
    expect(host.lifecycle.canSave()).toBe(false);
  });

  it('uses the Better Plants icon in portfolio cards and retains the page icon for other account and facility reports', async () => {
    const { store } = await setupReportInventory();
    const saved = store.snapshot()!;
    store.publish({ ...saved, accountReports: [
      { ...saved.accountReports[0], guid: 'plants', name: 'Better Plants report', reportType: 'betterPlants' },
      { ...saved.accountReports[0], guid: 'analysis', reportType: 'analysis' }
    ] });
    const fixture = TestBed.createComponent(ReportsInventoryComponent); fixture.detectChanges();
    const tiles = fixture.componentInstance.tiles();
    expect(tiles.filter(tile => tile.icon === 'betterPlantsReport')).toHaveLength(1);
    expect(tiles.filter(tile => tile.icon === 'report')).toHaveLength(2);
    for (const level of ['simple', 'summary', 'detailed'] as const) {
      fixture.componentInstance.inventory.detailControl.setValue(level); fixture.detectChanges();
      for (const tile of fixture.nativeElement.querySelectorAll('.portfolio-inventory .portfolio-tile') as NodeListOf<HTMLElement>) {
        const plants = tile.querySelector('.portfolio-tile__name')?.textContent?.trim() === 'Better Plants report';
        expect(!!tile.querySelector('.portfolio-tile__report-pending')).toBe(!plants);
      }
    }
    expect(store.committedRevision()).toBeUndefined();
  });
  for (const scope of ['account', 'facility'] as const) {
    it.each(['idle', 'evaluating'] as const)(`preserves ${scope} browse state while checks are %s, then clamps settled changes`, async pending => {
      const { store, status } = await setupReportInventory(scope);
      const saved = store.snapshot()!;
      store.publish({ ...saved,
        accountReports: Array.from({ length: 50 }, (_, i) => ({ ...saved.accountReports[0], guid: `account-${i}` })),
        facilityReports: Array.from({ length: 50 }, (_, i) => reportFixture({ guid: `facility-${i}` }))
      });
      const first = TestBed.createComponent(ReportsInventoryComponent); first.detectChanges();
      first.componentInstance.filtersForm.controls.status.setValue('ready'); first.detectChanges();
      first.componentInstance.inventory.selectPage(1);
      const target = first.componentInstance.inventory.visibleIds()[0];
      first.componentInstance.inventory.setTileDetail({ guid: target, level: 'detailed' });
      const key = first.componentInstance.browseKey()!;
      status.set(pending); first.detectChanges();
      expect(first.componentInstance.filteredEntries()).toHaveLength(0);
      expect(first.componentInstance.inventory.page()).toBe(1);
      expect(first.componentInstance.browseReady()).toBe(false);
      first.destroy();

      const returned = TestBed.createComponent(ReportsInventoryComponent); returned.detectChanges();
      const component = returned.componentInstance;
      expect(component.filters().status).toBe('ready');
      expect(component.inventory.page()).toBe(1);
      expect(TestBed.inject(BrowseStateService).readInventoryView(key)?.page).toBe(1);
      expect(component.browseReady()).toBe(false);

      status.set('ready'); returned.detectChanges();
      expect(component.browseReady()).toBe(true);
      expect(component.inventory.page()).toBe(1);
      expect(component.inventory.visibleIds()).toContain(target);
      expect(component.inventory.overrides()[target]).toBe('detailed');
      status.set('error'); returned.detectChanges();
      expect(component.browseReady()).toBe(true);
      expect(component.inventory.page()).toBe(0);
      component.filtersForm.controls.status.setValue('all'); returned.detectChanges();
      expect(component.filteredEntries().every(entry => entry.status === 'unavailable')).toBe(true);
    });
  }

  it('normalizes an unavailable report type after returning to a facility with saved filters', async () => {
    const { store, state } = await setupReportInventory('facility');
    const saved = store.snapshot()!;
    store.publish({ ...saved, facilities: [...saved.facilities, { ...reportFacility, guid: 'facility-b', name: 'Facility B' }],
      facilityReports: [...saved.facilityReports, reportFixture({ guid: 'factors', facilityReportType: 'emissionFactors' })] });
    const fixture = TestBed.createComponent(ReportsInventoryComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.filtersForm.controls.type.setValue('facility:emissionFactors'); fixture.detectChanges();
    expect(component.filteredEntries()).toHaveLength(1);
    state.set({ facilityGuid: 'facility-b' }); fixture.detectChanges();
    store.publish({ ...store.snapshot()!, account: { ...saved.account, displayEmissions: false } }); fixture.detectChanges();
    state.set({ accountGuid: 'account-a' }); TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid;
    (TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid as import('@angular/core').WritableSignal<string | undefined>).set('facility-a'); fixture.detectChanges();
    expect(component.filtersForm.controls.type.value).toBe('all');
    expect(component.filters().type).toBe('all');
    expect(component.filteredEntries().map(entry => entry.report.guid)).toEqual(['report-a']);
    state.set({ facilityGuid: 'facility-b' }); fixture.detectChanges();
    state.set({ accountGuid: 'account-a' }); TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid;
    (TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid as import('@angular/core').WritableSignal<string | undefined>).set('facility-a'); fixture.detectChanges();
    expect(component.filtersForm.controls.type.value).toBe('all');
  });

  it('restores the facility report default after discarding and reopening an account draft', async () => {
    const { facilityActions } = await setupReportInventory();
    const fixture = TestBed.createComponent(ReportsInventoryComponent); fixture.detectChanges();
    const lifecycle = fixture.componentInstance.lifecycle;
    lifecycle.openCreate();
    lifecycle.form.controls.scope.setValue('facility');
    lifecycle.form.controls.facilityGuid.setValue('facility-a');
    lifecycle.form.controls.type.setValue('overview');
    lifecycle.requestClose();
    expect(lifecycle.confirmation()).toBe('discard');
    lifecycle.discardEditor();

    lifecycle.openCreate();
    expect(lifecycle.form.controls.type.value).toBe('betterPlants');
    lifecycle.form.controls.scope.setValue('facility');
    lifecycle.form.controls.facilityGuid.setValue('facility-a');
    expect(lifecycle.form.controls.type.value).toBe('analysis');
    expect(lifecycle.canSave()).toBe(true);
    await lifecycle.submit();
    expect(facilityActions.create).toHaveBeenCalledWith('facility-a', 'New Report', 'analysis');
  });

  it('restores account controls and overrides independently of facility and Analysis preferences', async () => {
    const { state, accountActions, facilityActions } = await setupReportInventory();
    const first = TestBed.createComponent(ReportsInventoryComponent); first.detectChanges();
    const key = first.componentInstance.entries()[0].key;
    first.componentInstance.filtersForm.controls.search.setValue('saved');
    first.componentInstance.inventory.detailControl.setValue('summary');
    first.componentInstance.inventory.setTileDetail({ guid: key, level: 'detailed' }); first.detectChanges(); first.destroy();
    const returned = TestBed.createComponent(ReportsInventoryComponent); returned.detectChanges();
    expect(returned.componentInstance.filtersForm.controls.search.value).toBe('saved');
    expect(returned.componentInstance.inventory.detail()).toBe('summary');
    expect(returned.componentInstance.inventory.overrides()[key]).toBe('detailed'); returned.destroy();
    state.set({ accountGuid: 'account-a' }); TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid;
    (TestBed.inject(WorkspaceNavigationService).inventoryFacilityGuid as import('@angular/core').WritableSignal<string | undefined>).set('facility-a');
    const facility = TestBed.createComponent(ReportsInventoryComponent); facility.detectChanges();
    expect(facility.componentInstance.filtersForm.controls.search.value).toBe('');
    expect(facility.componentInstance.inventory.detail()).toBe('summary'); expect(facility.componentInstance.inventory.overrides()).toEqual({});
    expect(accountActions.updateName).not.toHaveBeenCalled(); expect(facilityActions.updateName).not.toHaveBeenCalled();
  });
  it('drops a remembered impact filter when Other Impacts is disabled without deleting saved reports', async () => {
    const { store } = await setupReportInventory();
    const saved = { ...store.snapshot()!, accountReports: [{ ...store.accountReports()[0], reportType: 'accountEmissionFactors' as const }] };
    store.publish(saved);
    const fixture = TestBed.createComponent(ReportsInventoryComponent); fixture.detectChanges();
    fixture.componentInstance.filtersForm.controls.type.setValue('account:accountEmissionFactors'); fixture.detectChanges();
    expect(fixture.componentInstance.filteredEntries()).toHaveLength(1);
    store.publish({ ...saved, account: { ...saved.account, displayEmissions: false } }); fixture.detectChanges();
    expect(fixture.componentInstance.filtersForm.controls.type.value).toBe('all'); expect(store.accountReports()).toHaveLength(1);
    expect(fixture.componentInstance.entries().every(entry => entry.scope === 'facility')).toBe(true);
  });
});

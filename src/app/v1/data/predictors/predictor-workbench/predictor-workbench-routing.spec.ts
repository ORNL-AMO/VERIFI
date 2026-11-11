import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionStorageService } from 'ngx-webstorage';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { account, facility } from '@app/v1/data/meters/facility-meters.testing';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { FACILITY_PREDICTORS_WORKSPACE_PROVIDERS } from '../facility-predictors.providers';
import { inventoryNavigation, inventoryPredictor } from '../inventory/predictor-inventory.testing';
import { PredictorWeatherWorkflowService } from '../predictor-weather-workflow.service';
import { StandardPredictorActionsService } from '../standard-predictor-actions.service';
import { PredictorWorkbenchComponent } from './predictor-workbench.component';
import { PredictorWorkbenchSettingsComponent } from './settings/predictor-workbench-settings.component';
import { PredictorWorkbenchReadingsComponent } from './readings/predictor-workbench-readings.component';
import { PredictorReadingEditorComponent } from './readings/predictor-reading-editor/predictor-reading-editor.component';

describe('routed predictor draft lifetime', () => {
  afterEach(() => vi.restoreAllMocks());

  it('retains the editor and raw draft when a committed publication removes its predictor', async () => {
    const { harness, store, snapshot, selectedFacility, updateSettings } = await setupRoute('settings');
    const editor = harness.routeDebugElement!.query(By.directive(PredictorWorkbenchSettingsComponent))
      .componentInstance as PredictorWorkbenchSettingsComponent;
    const form = editor.form()!;
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('input[formControlName="name"]')!;
    input.value = '  Unsaved local output  '; input.dispatchEvent(new Event('input')); harness.detectChanges();
    expect(editor.hasUnsavedChanges()).toBe(true);

    store.publishCommitted({ ...snapshot, predictors: [] }, { facility: selectedFacility });
    harness.detectChanges(); TestBed.tick();

    expect(harness.routeDebugElement!.query(By.directive(PredictorWorkbenchSettingsComponent))?.componentInstance).toBe(editor);
    expect(editor.form()).toBe(form);
    expect(form.controls.name.value).toBe('  Unsaved local output  ');
    expect(harness.routeNativeElement!.textContent).toContain('Your draft has been retained');
    expect(form.disabled).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(true);
    expect(await editor.saveNow()).toBe(false);
    expect(updateSettings).not.toHaveBeenCalled();
    expect(store.predictors()).toEqual([]);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(await TestBed.inject(Router).navigateByUrl('/inventory')).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/predictors/predictor-a/settings');
    expect(form.controls.name.value).toBe('  Unsaved local output  ');
    confirm.mockReturnValue(true);
    expect(await TestBed.inject(Router).navigateByUrl('/inventory')).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(false);
  });

  it('retains a dirty reading editor and navigation protection when its predictor disappears', async () => {
    const { harness, store, snapshot, selectedFacility, updatePredictorReading } = await setupRoute('readings');
    const readings = harness.routeDebugElement!.query(By.directive(PredictorWorkbenchReadingsComponent))
      .componentInstance as PredictorWorkbenchReadingsComponent;
    readings.openEditReading(store.predictorData()[0]); harness.detectChanges();
    const editor = harness.routeDebugElement!.query(By.directive(PredictorReadingEditorComponent))
      .componentInstance as PredictorReadingEditorComponent;
    const form = editor.form!;
    form.controls.amount.setValue(99); harness.detectChanges();
    expect(readings.hasUnsavedChanges()).toBe(true);

    store.publishCommitted({ ...snapshot, predictors: [], predictorData: [] }, { facility: selectedFacility });
    harness.detectChanges(); TestBed.tick();

    expect(harness.routeDebugElement!.query(By.directive(PredictorWorkbenchReadingsComponent))?.componentInstance).toBe(readings);
    expect(harness.routeDebugElement!.query(By.directive(PredictorReadingEditorComponent))?.componentInstance).toBe(editor);
    expect(editor.form).toBe(form);
    expect(form.controls.amount.value).toBe(99);
    expect(form.disabled).toBe(true);
    expect(readings.hasUnsavedChanges()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(true);
    editor.save(false);
    expect(updatePredictorReading).not.toHaveBeenCalled();
    const unload = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(await TestBed.inject(Router).navigateByUrl('/inventory')).toBe(false);
    expect(form.controls.amount.value).toBe(99);
    confirm.mockReturnValue(true);
    expect(await TestBed.inject(Router).navigateByUrl('/inventory')).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(false);
  });
});

async function setupRoute(tab: 'settings' | 'readings') {
  const updateSettings = vi.fn();
  const updatePredictorReading = vi.fn();
  TestBed.configureTestingModule({ providers: [
    provideRouter([
      { path: 'predictors/:predictorGuid', component: PredictorWorkbenchComponent, children: [
        { path: 'settings', component: PredictorWorkbenchSettingsComponent, canDeactivate: [unsavedChangesGuard],
          data: { predictorTab: 'settings' } },
        { path: 'readings', component: PredictorWorkbenchReadingsComponent, canDeactivate: [unsavedChangesGuard],
          data: { predictorTab: 'readings' } }
      ] },
      { path: 'inventory', children: [] }
    ]),
    FacilityPredictorsWorkspaceService,
    { provide: PredictorWeatherWorkflowService, useValue: { busy: signal(false) } },
    { provide: SessionStorageService, useValue: { retrieve: () => null, store: vi.fn() } },
    { provide: StandardPredictorActionsService, useValue: { updateSettings, updatePredictorReading } },
    { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal([]), predictorFindings: () => [],
      warningActionError: signal(undefined), canManageWarnings: signal(true) } },
    { provide: WorkspaceNavigationService, useValue: { ...inventoryNavigation,
      openFacilityInventory: () => TestBed.inject(Router).navigateByUrl('/inventory') } },
    { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } }
  ] });
  TestBed.overrideComponent(PredictorWorkbenchComponent, { remove: { providers: FACILITY_PREDICTORS_WORKSPACE_PROVIDERS } });
  const store = TestBed.inject(AccountWorkspaceStore);
  const selectedFacility = facility();
  const snapshot: AccountWorkspaceSnapshot = { account: account(), facilities: [selectedFacility],
    predictors: [inventoryPredictor('predictor-a', { accountId: 'account-a', facilityId: 'facility-a', name: 'Saved output' })],
    meters: [], meterData: [], meterGroups: [], predictorData: [{
      id: 20, guid: 'reading-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
      year: 2026, month: 1, amount: 12, notes: '', weatherDataWarning: false, weatherOverride: false,
      createdDate: new Date('2026-01-01'), modifiedDate: new Date('2026-01-01')
    }], facilityAnalyses: [], accountAnalyses: [],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
    energyUseGroups: [], savedVisualizations: [], energyUseEquipment: [] };
  store.publish(snapshot, { facility: selectedFacility });
  const harness = await RouterTestingHarness.create(`/predictors/predictor-a/${tab}`);
  return { harness, store, snapshot, selectedFacility, updateSettings, updatePredictorReading };
}

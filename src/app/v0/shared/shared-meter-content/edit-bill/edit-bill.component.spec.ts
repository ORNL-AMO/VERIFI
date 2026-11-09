import { CUSTOM_ELEMENTS_SCHEMA, NgModule, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { ElectronService } from '@platform/electron/electron.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import { EditBillComponent } from './edit-bill.component';

@NgModule({ declarations: [EditBillComponent], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
class EditBillTestModule { }

describe('EditBillComponent reading validation', () => {
  let component: EditBillComponent;
  let guard: RouterGuardService;
  let add: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let execute: ReturnType<typeof vi.fn>;
  let setLoadingStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    add = vi.fn(async reading => ({ ...reading, id: 1 }));
    update = vi.fn(async reading => reading);
    execute = vi.fn(async (_metadata, persist) => ({ value: await persist() }));
    setLoadingStatus = vi.fn();
    TestBed.configureTestingModule({
      imports: [EditBillTestModule],
      providers: [
        EditBillComponent,
        UtilityMeterDataService,
        RouterGuardService,
        { provide: AccountWorkspaceStore, useValue: {
          account: signal({ guid: 'account-a' }), selectedFacility: signal(null), meterData: signal([])
        } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: WorkspaceCommandBoundary, useValue: { execute } },
        { provide: MeterCommandHandler, useValue: { addMeterData: add, updateMeterData: update } },
        { provide: LoadingService, useValue: { setLoadingStatus, setLoadingMessage: vi.fn() } },
        { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
        { provide: ElectronService, useValue: {} }
      ]
    });
    component = TestBed.inject(EditBillComponent);
    component.paramsSub = new Subscription();
    guard = TestBed.inject(RouterGuardService);
    component.editMeter = {
      guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', source: 'Other Energy',
      startingUnit: 'klb', energyUnit: 'MMBtu', heatCapacity: 2, scope: 3, canBeNegative: true
    } as IdbUtilityMeter;
    component.editMeterData = {
      ...getNewIdbUtilityMeterData(component.editMeter, []),
      day: 15, month: 1, year: 2025, totalVolume: -10, totalEnergyUse: -20
    };
    component.addOrEdit = 'add';
    component.inDataManagement = true;
    component.setDisplayHeatCapacity();
    component.setMeterDataForm();
  });

  it('accepts enabled negative physical consumption in the editor', () => {
    expect(component.meterDataForm.valid).toBe(true);
  });

  it.each(['add', 'edit'] as const)('saves an enabled negative reading in %s mode', async mode => {
    component.addOrEdit = mode;
    await component.saveAndQuit();
    expect(mode === 'add' ? add : update).toHaveBeenCalledWith(
      expect.objectContaining({ totalVolume: -10, totalEnergyUse: -20 }), 'account-a'
    );
    expect(component.meterDataForm.pristine).toBe(true);
  });

  it('saves negative consumption and prepares the next reading', async () => {
    await component.saveAndAddAnother();
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ totalVolume: -10, totalEnergyUse: -20 }), 'account-a');
    expect(component.meterDataForm.controls.readDate.value).toBe('2025-02-15');
    expect(component.meterDataForm.controls.totalVolume.hasError('required')).toBe(true);
    component.meterDataForm.patchValue({ totalVolume: -5, totalEnergyUse: -10 });
    expect(component.meterDataForm.valid).toBe(true);
  });

  it.each(['invalid consumption', 'invalid date'] as const)('blocks every save entry point for %s', async reason => {
    if (reason === 'invalid consumption') {
      component.editMeter.canBeNegative = false;
      component.setMeterDataForm();
    } else {
      component.invalidDate = true;
    }
    const original = { ...component.editMeterData };
    await component.saveAndQuit();
    await component.saveAndAddAnother();
    component.handleKeyDown(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    component.meterDataForm.markAsDirty();
    const navigation = firstValueFrom(component.canDeactivate());
    expect(guard.showSave.value).toBe(false);
    guard.setModalAction('save');
    expect(await navigation).toBe(false);
    expect(execute).not.toHaveBeenCalled();
    expect(setLoadingStatus).not.toHaveBeenCalled();
    expect(component.editMeterData).toEqual(original);
  });

  it('rechecks validity if a reading becomes invalid while the dialog is open', async () => {
    component.meterDataForm.markAsDirty();
    const navigation = firstValueFrom(component.canDeactivate());
    expect(guard.showSave.value).toBe(true);
    component.meterDataForm.controls.totalVolume.setValue(null);
    guard.setModalAction('save');
    expect(await navigation).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it('saves a valid negative reading through the unsaved-changes dialog', async () => {
    component.meterDataForm.markAsDirty();
    const navigation = firstValueFrom(component.canDeactivate());
    guard.setModalAction('save');
    expect(await navigation).toBe(true);
    expect(add).toHaveBeenCalledOnce();
  });

  it.each([['discard', true], ['cancel', false]] as const)('handles %s without saving an invalid reading', async (action, allowed) => {
    component.meterDataForm.controls.totalVolume.setValue(null);
    component.meterDataForm.markAsDirty();
    const navigation = firstValueFrom(component.canDeactivate());
    guard.setModalAction(action);
    expect(await navigation).toBe(allowed);
    expect(execute).not.toHaveBeenCalled();
  });
});

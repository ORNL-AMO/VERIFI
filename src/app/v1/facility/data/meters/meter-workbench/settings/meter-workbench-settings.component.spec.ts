import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { vi } from 'vitest';
import { ModalPortalService } from '../../../../../shell/modal-portal.service';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { account, facility, meter, reading } from '../../facility-meters.testing';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MetersDashboardActionsService } from '../../meters-dashboard/meters-dashboard-actions.service';
import { ConfirmDeleteMeterModalComponent } from '../../meters-dashboard/meters-browse-view/meter-browse-card/confirm-delete-meter-modal/confirm-delete-meter-modal.component';
import { MeterSettingsChargesFormComponent } from './meter-settings-charges-form/meter-settings-charges-form.component';
import { MeterSettingsCoreFormComponent } from './meter-settings-core-form/meter-settings-core-form.component';
import { MeterSettingsElectricityFormComponent } from './meter-settings-electricity-form/meter-settings-electricity-form.component';
import { MeterSettingsEmissionsDetailsComponent } from './meter-settings-emissions-details/meter-settings-emissions-details.component';
import { MeterSettingsFormService } from './meter-settings-form.service';
import { MeterSettingsOtherInfoComponent } from './meter-settings-other-info/meter-settings-other-info.component';
import { MeterSettingsStatusFormComponent } from './meter-settings-status-form/meter-settings-status-form.component';
import { MeterSettingsVehicleFormComponent } from './meter-settings-vehicle-form/meter-settings-vehicle-form.component';
import { MeterWorkbenchSettingsComponent } from './meter-workbench-settings.component';

describe('MeterWorkbenchSettingsComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the major settings sections for the selected meter', () => {
    const fixture = setup();

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent;
    expect(text).not.toContain('Meter setup');
    expect(text).toContain('Meter information');
    expect(element.querySelector('.meter-settings-section__heading')?.textContent).toContain('Changes save automatically');
    expect(text).toContain('Electricity options');
    expect(text).toContain('Meter charges');
    expect(text).toContain('Other information');
    expect(text).toContain('Status settings');
    expect(element.querySelector('.meter-settings__aside app-meter-settings-charges-form')).not.toBeNull();
    expect(element.querySelector('.meter-settings__main app-meter-settings-other-info')).not.toBeNull();
    expect(element.querySelector('.meter-settings__main app-meter-settings-status-form')).not.toBeNull();
  });

  it('does not render electricity options for non-electric meters', () => {
    const fixture = setup({ source: 'Natural Gas' });

    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).not.toContain('Electricity options');
    expect(text).not.toContain('Electricity agreement options');
  });

  it('autosaves valid text changes through the workspace command boundary', async () => {
    vi.useFakeTimers();
    const fixture = setup();
    const commandBoundary = TestBed.inject(WorkspaceCommandBoundary) as unknown as { execute: ReturnType<typeof vi.fn> };
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const nameInput = query<HTMLInputElement>(fixture, 'input[formControlName="name"]');
    nameInput.value = 'Updated Meter';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(700);
    await fixture.whenStable();

    expect(commandBoundary.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKind: 'meter',
        changeKind: 'update',
        label: 'Saving meter settings'
      }),
      expect.any(Function)
    );
    expect(meterHandler.updateMeterWithData).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated Meter' }),
      [],
      'account-a'
    );
  });

  it('does not save invalid form states', async () => {
    vi.useFakeTimers();
    const fixture = setup();
    const commandBoundary = TestBed.inject(WorkspaceCommandBoundary) as unknown as { execute: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const nameInput = query<HTMLInputElement>(fixture, 'input[formControlName="name"]');
    nameInput.value = '';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(700);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(commandBoundary.execute).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Resolve validation issues');
  });

  it('updates meter data charges when charge definitions change', async () => {
    const fixture = setup({ withReading: true });
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    query<HTMLButtonElement>(fixture, 'app-meter-settings-charges-form .v1-btn--action').click();
    await fixture.whenStable();

    const persistedMeter = meterHandler.updateMeterWithData.mock.calls[0][0];
    const dataUpdates = meterHandler.updateMeterWithData.mock.calls[0][1];
    expect(persistedMeter.charges).toHaveLength(1);
    expect(dataUpdates).toEqual([
      expect.objectContaining({
        guid: 'reading-a',
        charges: [expect.objectContaining({ chargeGuid: persistedMeter.charges[0].guid })]
      })
    ]);
  });

  it('locks setup fields when readings exist and unlocks them through the warning affordance', () => {
    const fixture = setup({ withReading: true });

    fixture.detectChanges();
    const sourceSelect = query<HTMLSelectElement>(fixture, 'select[formControlName="source"]');
    expect(sourceSelect.disabled).toBe(true);

    fixture.componentInstance.enableSetupChanges();
    fixture.detectChanges();

    expect(fixture.componentInstance.changingSetupValues()).toBe(true);
    expect(fixture.componentInstance.formSignal()?.controls.source.disabled).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('does not alter amounts already entered');
  });

  it('disables the form for read-only workspaces without shifting layout during autosave pending state', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(query<HTMLInputElement>(readOnlyFixture, 'input[formControlName="name"]').disabled).toBe(true);
    expect((readOnlyFixture.nativeElement as HTMLElement).textContent).toContain('read-only');

    TestBed.resetTestingModule();

    const pendingFixture = setup({ hasPending: true });
    pendingFixture.detectChanges();
    expect(query<HTMLInputElement>(pendingFixture, 'input[formControlName="name"]').disabled).toBe(false);
    expect((pendingFixture.nativeElement as HTMLElement).textContent).not.toContain('finishing');
  });

  it('keeps the form stable while its own autosave reload is in progress', () => {
    const fixture = setup({ canWrite: false });

    fixture.detectChanges();
    fixture.componentInstance.saveState.set('saving');
    fixture.componentInstance.saveMessage.set('Saving settings...');
    fixture.detectChanges();

    expect(query<HTMLInputElement>(fixture, 'input[formControlName="name"]').disabled).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('read-only');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Saving settings');
  });

  it('opens a delete confirmation from the form footer and deletes the meter', async () => {
    const fixture = setup({ withReading: true });
    const actions = TestBed.inject(MetersDashboardActionsService) as unknown as { deleteMeter: ReturnType<typeof vi.fn> };
    const modalPortal = TestBed.inject(ModalPortalService) as unknown as { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    query<HTMLButtonElement>(fixture, '.meter-settings__footer .v1-btn--danger').click();
    fixture.detectChanges();

    expect(modalPortal.show).toHaveBeenCalledOnce();

    await fixture.componentInstance.confirmDeleteMeter();
    await fixture.whenStable();

    expect(actions.deleteMeter).toHaveBeenCalledWith(expect.objectContaining({ guid: 'meter-a' }));
    expect(modalPortal.hide).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters'
    ]);
  });

  it('disables meter deletion for read-only workspaces', () => {
    const fixture = setup({ canWrite: false });

    fixture.detectChanges();

    expect(query<HTMLButtonElement>(fixture, '.meter-settings__footer .v1-btn--danger').disabled).toBe(true);
  });
});

function setup(options: {
  canWrite?: boolean;
  hasPending?: boolean;
  withReading?: boolean;
  source?: 'Electricity' | 'Natural Gas';
} = {}): ComponentFixture<MeterWorkbenchSettingsComponent> {
  const selectedMeter = signal(meter({
    id: 1,
    guid: 'meter-a',
    name: 'Electric Main',
    source: options.source ?? 'Electricity',
    charges: []
  }));
  const selectedMeterData = signal(options.withReading
    ? [reading({ id: 7, guid: 'reading-a', meterId: 'meter-a', charges: [] })]
    : []
  );
  const selectedMeterCard = signal({
    meter: selectedMeter(),
    readingCount: selectedMeterData().length
  });
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const activeAccount = signal(account({ assessmentReportVersion: 'AR6' }));
  const selectedFacility = signal(facility({
    energyUnit: 'MMBtu',
    electricityUnit: 'kWh',
    volumeGasUnit: 'CCF',
    volumeLiquidUnit: 'gal',
    massUnit: 'lb'
  }));
  const execute = vi.fn(async (_options, persist: () => Promise<unknown>) => {
    const value = await persist();
    return { value, change: { entityKind: 'meter', changeKind: 'update', accountGuid: 'account-a' } };
  });
  const updateMeterWithData = vi.fn(async savedMeter => savedMeter);
  const deleteMeter = vi.fn().mockResolvedValue(undefined);

  TestBed.configureTestingModule({
    declarations: [
      MeterWorkbenchSettingsComponent,
      MeterSettingsCoreFormComponent,
      MeterSettingsVehicleFormComponent,
      MeterSettingsElectricityFormComponent,
      MeterSettingsChargesFormComponent,
      MeterSettingsOtherInfoComponent,
      MeterSettingsStatusFormComponent,
      MeterSettingsEmissionsDetailsComponent
    ],
    imports: [CommonModule, ReactiveFormsModule, ConfirmDeleteMeterModalComponent],
    providers: [
      MeterSettingsFormService,
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          account: activeAccount,
          facility: selectedFacility,
          selectedMeter,
          selectedMeterCard,
          selectedMeterData,
          canWrite,
          hasPending
        }
      },
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account: activeAccount,
          facilities: () => [selectedFacility()],
          selectedFacility,
          customFuels: signal([]),
          customGWPs: signal([])
        }
      },
      {
        provide: WorkspaceCommandBoundary,
        useValue: { execute }
      },
      {
        provide: MeterCommandHandler,
        useValue: { updateMeterWithData }
      },
      {
        provide: MetersDashboardActionsService,
        useValue: { deleteMeter }
      },
      {
        provide: ModalPortalService,
        useValue: { show: vi.fn(), hide: vi.fn() }
      },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityDataRoute: (facilityGuid: string, detail = 'meters') => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            detail
          ]
        }
      },
      {
        provide: Router,
        useValue: { navigate: vi.fn().mockResolvedValue(true) }
      }
    ]
  });

  return TestBed.createComponent(MeterWorkbenchSettingsComponent);
}

function query<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T {
  const element = (fixture.nativeElement as HTMLElement).querySelector<T>(selector);
  expect(element).not.toBeNull();
  return element as T;
}

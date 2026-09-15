import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { vi } from 'vitest';
import { ModalPortalService } from '../../../../../shell/modal-portal.service';
import { IconComponent } from '../../../../../shared/icons/icon.component';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { account, facility, meter, reading } from '../../facility-meters.testing';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MetersDashboardActionsService } from '../../meters-dashboard/meters-dashboard-actions.service';
import { ConfirmDeleteMeterModalComponent } from '../../meters-dashboard/meter-browse-card/confirm-delete-meter-modal/confirm-delete-meter-modal.component';
import { TooltipComponent } from '../../../../../shared/tooltip/tooltip.component';
import { MeterCalendarizationHelpSlideoutComponent } from './meter-calendarization-help-slideout/meter-calendarization-help-slideout.component';
import { MeterSettingsChargesFormComponent } from './meter-settings-charges-form/meter-settings-charges-form.component';
import { MeterSettingsCoreFormComponent } from './meter-settings-core-form/meter-settings-core-form.component';
import { MeterSettingsElectricityFormComponent } from './meter-settings-electricity-form/meter-settings-electricity-form.component';
import { MeterSettingsEmissionsDetailsComponent } from './meter-settings-emissions-details/meter-settings-emissions-details.component';
import { MeterSettingsFormService } from './meter-settings-form.service';
import { MeterSettingsOtherInfoComponent } from './meter-settings-other-info/meter-settings-other-info.component';
import { MeterSettingsReadingFormComponent } from './meter-settings-reading-form/meter-settings-reading-form.component';
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
    expect(text).toContain('Meter Reading Settings');
    expect(text).toContain('Calendarization Method');
    expect(text).toContain('View example');
    expect(text).toContain('Allow Negative Readings');
    expect(text).toContain('Ignore Date Related Status Checks');
    expect(element.querySelector('.meter-settings-section__heading')?.textContent).toContain('Changes save automatically');
    expect(text).toContain('Electricity options');
    expect(text).toContain('Meter charges');
    expect(text).toContain('Other information');
    expect(text).toContain('Mark no longer in use');
    expect(text).not.toContain('Status settings');
    expect(element.querySelector('.meter-settings__aside app-meter-settings-reading-form')).not.toBeNull();
    expect(element.querySelector('.meter-settings__aside app-meter-settings-charges-form')).not.toBeNull();
    expect(element.querySelector('.meter-settings__main app-meter-settings-other-info')).not.toBeNull();
  });

  it('anchors the negative readings setting and scrolls to it when the route fragment is present', async () => {
    vi.useFakeTimers();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      const fixture = setup({ fragment: 'meter-reading-settings' });
      fixture.detectChanges();

      await vi.runOnlyPendingTimersAsync();

      const readingSettings = query<HTMLElement>(fixture, '#meter-reading-settings');
      expect(readingSettings.textContent).toContain('Allow Negative Readings');
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
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

  it('autosaves calendarization method changes through the meter settings path', async () => {
    const fixture = setup();
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const form = fixture.componentInstance.formSignal();
    expect(form).toBeDefined();
    form?.controls.meterReadingDataApplication.patchValue('fullYear');
    form?.markAsDirty();
    await fixture.componentInstance.saveNow();
    await fixture.whenStable();

    expect(meterHandler.updateMeterWithData).toHaveBeenCalledWith(
      expect.objectContaining({ meterReadingDataApplication: 'fullYear' }),
      [],
      'account-a'
    );
  });

  it('requires a calendarization method before saving settings', async () => {
    vi.useFakeTimers();
    const fixture = setup({ meterReadingDataApplication: undefined });
    const commandBoundary = TestBed.inject(WorkspaceCommandBoundary) as unknown as { execute: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const nameInput = query<HTMLInputElement>(fixture, 'input[formControlName="name"]');
    nameInput.value = 'Updated Meter';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(700);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(commandBoundary.execute).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Resolve validation issues');
  });

  it('uses a tooltip for the calendarization change warning when readings exist', () => {
    const fixture = setup({ withReading: true });

    fixture.detectChanges();

    const tooltip = query<HTMLElement>(fixture, 'app-meter-settings-reading-form app-ui-tooltip');
    const button = query<HTMLButtonElement>(fixture, 'app-meter-settings-reading-form app-ui-tooltip .v1-tooltip');
    expect(tooltip.textContent).toContain('Changing this affects calendarized reporting results');
    expect(button.getAttribute('aria-label')).toContain('does not change original readings');
  });

  it('opens and closes the calendarization explanation slideout', () => {
    const fixture = setup({
      readings: [
        reading({ guid: 'reading-a', meterId: 'meter-a', month: 1, day: 15, totalEnergyUse: 100 }),
        reading({ guid: 'reading-b', meterId: 'meter-a', month: 2, day: 15, totalEnergyUse: 200 }),
        reading({ guid: 'reading-c', meterId: 'meter-a', month: 3, day: 15, totalEnergyUse: 300 })
      ]
    });

    fixture.detectChanges();
    query<HTMLButtonElement>(fixture, '.meter-settings-calendarization__help').click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Calendarization example');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Worked allocation');

    query<HTMLButtonElement>(fixture, '.v1-meter-slideout__header .v1-icon-btn').click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Calendarization example');
  });

  it('saves calendarization method changes made from the slideout', async () => {
    const fixture = setup({
      readings: [
        reading({ guid: 'reading-a', meterId: 'meter-a', month: 1, day: 15, totalEnergyUse: 100 }),
        reading({ guid: 'reading-b', meterId: 'meter-a', month: 2, day: 15, totalEnergyUse: 200 }),
        reading({ guid: 'reading-c', meterId: 'meter-a', month: 3, day: 15, totalEnergyUse: 300 })
      ]
    });
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    query<HTMLButtonElement>(fixture, '.meter-settings-calendarization__help').click();
    fixture.detectChanges();
    optionButton(fixture, 'Evenly Distribute Data Annually').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(meterHandler.updateMeterWithData).toHaveBeenCalledWith(
      expect.objectContaining({ meterReadingDataApplication: 'fullYear' }),
      expect.any(Array),
      'account-a'
    );
    expect(fixture.componentInstance.formSignal()?.controls.meterReadingDataApplication.value).toBe('fullYear');
    expect(query<HTMLElement>(fixture, '.calendarization-help-choice--selected').textContent).toContain('Evenly Distribute Data Annually');
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

  it('uses compact charge controls and only shows charge field labels on the first row', async () => {
    const fixture = setup();

    fixture.detectChanges();
    const addButton = query<HTMLButtonElement>(fixture, 'app-meter-settings-charges-form .v1-btn--action');
    expect(addButton.classList.contains('v1-btn--sm')).toBe(true);
    expect(addButton.textContent).toContain('Add Charge');

    addButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    addButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.meter-settings-charge');
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('label:first-child span')?.classList.contains('visually-hidden')).toBe(false);
    expect(rows[0].querySelector('label:nth-child(2) span')?.classList.contains('visually-hidden')).toBe(false);
    expect(rows[1].querySelector('label:first-child span')?.classList.contains('visually-hidden')).toBe(true);
    expect(rows[1].querySelector('label:nth-child(2) span')?.classList.contains('visually-hidden')).toBe(true);
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

  it('toggles no longer in use from the form footer and saves the meter', async () => {
    const fixture = setup();
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    query<HTMLButtonElement>(fixture, '.meter-settings__inactive-toggle').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(meterHandler.updateMeterWithData).toHaveBeenCalledWith(
      expect.objectContaining({ noLongerInUse: true }),
      [],
      'account-a'
    );
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Inactive date');
    expect(text).toContain('Return meter to use');
    expect(query<HTMLButtonElement>(fixture, '.meter-settings__inactive-toggle').classList.contains('v1-btn--quiet')).toBe(true);
    expect(text.indexOf('Inactive date')).toBeLessThan(text.indexOf('Allow Negative Readings'));
    expect(text.indexOf('Allow Negative Readings')).toBeLessThan(text.indexOf('Calendarization Method'));
    expect(query<HTMLButtonElement>(fixture, '.meter-settings__inactive-toggle').getAttribute('aria-pressed')).toBe('true');
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
  readings?: ReturnType<typeof reading>[];
  source?: 'Electricity' | 'Natural Gas';
  fragment?: string;
  meterReadingDataApplication?: ReturnType<typeof meter>['meterReadingDataApplication'];
} = {}): ComponentFixture<MeterWorkbenchSettingsComponent> {
  const selectedMeter = signal(meter({
    id: 1,
    guid: 'meter-a',
    name: 'Electric Main',
    source: options.source ?? 'Electricity',
    ...(Object.prototype.hasOwnProperty.call(options, 'meterReadingDataApplication')
      ? { meterReadingDataApplication: options.meterReadingDataApplication }
      : {}),
    charges: []
  }));
  const selectedMeterData = signal(options.readings ?? (options.withReading
    ? [reading({ id: 7, guid: 'reading-a', meterId: 'meter-a', charges: [] })]
    : []
  ));
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
      MeterSettingsReadingFormComponent,
      MeterSettingsEmissionsDetailsComponent
    ],
    imports: [CommonModule, ReactiveFormsModule, IconComponent, ConfirmDeleteMeterModalComponent, MeterCalendarizationHelpSlideoutComponent, TooltipComponent],
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
        provide: ActivatedRoute,
        useValue: { snapshot: { fragment: options.fragment ?? null } }
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

function optionButton(fixture: ComponentFixture<unknown>, label: string): HTMLButtonElement {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.calendarization-help-choice')
  ).find(option => option.textContent?.includes(label));
  expect(button).toBeDefined();
  return button as HTMLButtonElement;
}

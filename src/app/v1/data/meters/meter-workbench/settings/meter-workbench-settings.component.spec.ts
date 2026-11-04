import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { CommonModule } from '@angular/common';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { account, facility, group, meter, reading } from '../../facility-meters.testing';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterActionsService } from '../../meter-actions.service';
import { ConfirmDeleteMeterModalComponent } from './confirm-delete-meter-modal/confirm-delete-meter-modal.component';
import { TooltipComponent } from '@app/v1/shared/tooltip/tooltip.component';
import { MeterCalendarizationHelpSlideoutComponent } from './meter-calendarization-help-slideout/meter-calendarization-help-slideout.component';
import { MeterSettingsFormService } from '@app/v1/shared/meter-settings/meter-settings-form.service';
import { MeterSettingsFormComponent } from '@app/v1/shared/meter-settings/meter-settings-form.component';
import { MeterSettingsChargesFormComponent } from '@app/v1/shared/meter-settings/meter-settings-charges-form/meter-settings-charges-form.component';
import { MeterSettingsCoreFormComponent } from '@app/v1/shared/meter-settings/meter-settings-core-form/meter-settings-core-form.component';
import { MeterSettingsElectricityFormComponent } from '@app/v1/shared/meter-settings/meter-settings-electricity-form/meter-settings-electricity-form.component';
import { MeterSettingsEmissionsDetailsComponent } from '@app/v1/shared/meter-settings/meter-settings-emissions-details/meter-settings-emissions-details.component';
import { MeterSettingsOtherInfoComponent } from '@app/v1/shared/meter-settings/meter-settings-other-info/meter-settings-other-info.component';
import { MeterSettingsReadingFormComponent } from '@app/v1/shared/meter-settings/meter-settings-reading-form/meter-settings-reading-form.component';
import { MeterSettingsVehicleFormComponent } from '@app/v1/shared/meter-settings/meter-settings-vehicle-form/meter-settings-vehicle-form.component';
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

  it.each([false, true])('hydrates saved dekatherms instead of the facility default when readings exist: %s', async withReading => {
    vi.useFakeTimers();
    const fixture = setup({
      withReading,
      meter: {
        source: 'Natural Gas',
        scope: 1,
        startingUnit: 'DTherms',
        energyUnit: 'DTherms',
        siteToSource: 1.25
      },
      facility: { volumeGasUnit: 'SCF' }
    });
    const commandBoundary = TestBed.inject(WorkspaceCommandBoundary) as unknown as { execute: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const collectionUnit = query<HTMLSelectElement>(fixture, 'select[formControlName="startingUnit"]');
    expect(collectionUnit.selectedOptions[0].textContent).toContain('Dekatherms');
    expect(collectionUnit.disabled).toBe(withReading);
    expect(fixture.componentInstance.formSignal()?.getRawValue()).toMatchObject({
      source: 'Natural Gas',
      scope: 1,
      startingUnit: 'DTherms',
      energyUnit: 'DTherms',
      siteToSource: 1.25
    });
    expect(fixture.componentInstance.formSignal()?.pristine).toBe(true);
    expect(fixture.componentInstance.viewModel()?.displayHeatCapacity).toBe(false);

    await vi.advanceTimersByTimeAsync(700);
    expect(commandBoundary.execute).not.toHaveBeenCalled();
  });

  it('preserves custom setup values when an unrelated name change autosaves', async () => {
    vi.useFakeTimers();
    const savedSetup = {
      source: 'Natural Gas' as const,
      scope: 1,
      startingUnit: 'CCF',
      energyUnit: 'GJ',
      heatCapacity: 0.12,
      siteToSource: 1.45
    };
    const fixture = setup({ meter: savedSetup, facility: { volumeGasUnit: 'SCF' } });
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    expect(fixture.componentInstance.formSignal()?.getRawValue()).toMatchObject(savedSetup);
    expect(fixture.componentInstance.formSignal()?.controls.heatCapacity.hasValidator(Validators.required)).toBe(true);
    expect(query<HTMLInputElement>(fixture, 'input[formControlName="heatCapacity"]').value).toBe('0.12');

    const nameInput = query<HTMLInputElement>(fixture, 'input[formControlName="name"]');
    nameInput.value = 'Gas meter renamed';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(700);
    await fixture.whenStable();

    expect(meterHandler.updateMeterWithData).toHaveBeenCalledWith(
      expect.objectContaining({ ...savedSetup, name: 'Gas meter renamed' }),
      [],
      'account-a'
    );
  });

  it('preserves a saved emissions scope and its validators during hydration', () => {
    const fixture = setup({
      meter: { source: 'Other', scope: 5, startingUnit: 'kg', globalWarmingPotentialOption: 101 }
    });

    fixture.detectChanges();

    const form = fixture.componentInstance.formSignal();
    expect(form?.controls.scope.value).toBe(5);
    expect(form?.controls.startingUnit.value).toBe('kg');
    expect(form?.controls.globalWarmingPotentialOption.value).toBe(101);
    expect(form?.controls.globalWarmingPotentialOption.hasValidator(Validators.required)).toBe(true);
    expect(fixture.componentInstance.viewModel()?.displayGlobalWarmingPotential).toBe(true);
  });

  it('applies facility defaults when the user changes the source', async () => {
    vi.useFakeTimers();
    const fixture = setup({ facility: { volumeGasUnit: 'SCF' } });
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const sourceSelect = query<HTMLSelectElement>(fixture, 'select[formControlName="source"]');
    sourceSelect.value = Array.from(sourceSelect.options)
      .find(option => option.textContent?.trim() === 'Natural Gas')!.value;
    sourceSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(700);
    await fixture.whenStable();

    expect(meterHandler.updateMeterWithData).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'Natural Gas', scope: 1, startingUnit: 'SCF', energyUnit: 'MMBtu' }),
      [],
      'account-a'
    );
  });

  it.each([
    { destination: 'Water group', expectedGroup: 'water-group', withReading: true },
    { destination: 'Ungrouped', expectedGroup: undefined, withReading: false }
  ])('guides an incompatible source change to $destination before saving', async ({ destination, expectedGroup, withReading }) => {
    vi.useFakeTimers();
    const fixture = setup({ source: 'Natural Gas', withReading,
      meter: { groupId: 'energy-group', scope: 1, startingUnit: 'SCF', energyUnit: 'MMBtu', heatCapacity: .001,
        waterIntakeType: 'Municipal (Non-potable)' },
      groups: [group({ guid: 'energy-group', name: 'Energy group', groupType: 'Energy' }),
        group({ guid: 'water-group', name: 'Water group', groupType: 'Water' }),
        group({ guid: 'foreign-group', name: 'Foreign water group', facilityId: 'other-facility', groupType: 'Water' })]
    });
    const handler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };
    const store = TestBed.inject(AccountWorkspaceStore);
    const originalReadings = structuredClone(store.meterData());
    fixture.detectChanges();
    if (withReading) query<HTMLButtonElement>(fixture, '.meter-settings__setup-lock button').click();
    selectOptionLabel(fixture, 'source', 'Water Intake'); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(700); fixture.detectChanges();
    expect(handler.updateMeterWithData).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saveState()).toBe('invalid');
    expect(fixture.componentInstance.formSignal()?.controls.groupId.value).toBe('energy-group');
    expect(fixture.nativeElement.textContent).toContain('energy meter group cannot contain Water Intake meters');
    expect(fixture.nativeElement.textContent).not.toContain('Settings could not be saved');
    const groupSelect = query<HTMLSelectElement>(fixture, 'select[formControlName="groupId"]');
    expect(groupSelect.selectedOptions[0].textContent).toContain('Energy group (incompatible)');
    expect(groupSelect.selectedOptions[0].disabled).toBe(true);
    expect([...groupSelect.options].some(option => option.textContent?.includes('Foreign'))).toBe(false);
    selectOptionLabel(fixture, 'groupId', destination); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0); await fixture.whenStable(); fixture.detectChanges();
    expect(handler.updateMeterWithData).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ source: 'Water Intake', groupId: expectedGroup, startingUnit: 'gal' }),
      [], 'account-a');
    expect(store.meterData()).toEqual(originalReadings);
    expect(fixture.componentInstance.session.dirty()).toBe(false);
  });

  it('shows the actual save failure so the user can understand the problem', async () => {
    vi.useFakeTimers(); const fixture = setup(); fixture.detectChanges();
    const handler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };
    handler.updateMeterWithData.mockRejectedValueOnce(new Error('The meter group is no longer available.'));
    fixture.componentInstance.formSignal()!.controls.name.setValue('Renamed');
    await vi.advanceTimersByTimeAsync(700); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The meter group is no longer available.');
    expect(fixture.componentInstance.formSignal()!.controls.name.value).toBe('Renamed');
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

  it('autosaves a direct typed control edit without a template event handler', async () => {
    vi.useFakeTimers();
    const fixture = setup(); fixture.detectChanges();
    const handler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };
    fixture.componentInstance.formSignal()!.controls.name.setValue('Direct control edit');
    await vi.advanceTimersByTimeAsync(700);
    expect(handler.updateMeterWithData).toHaveBeenCalledWith(expect.objectContaining({ name: 'Direct control edit' }), [], 'account-a');
  });

  it('does not write an edit reverted to the saved values before the debounce expires', async () => {
    vi.useFakeTimers();
    const fixture = setup(); fixture.detectChanges();
    const boundary = TestBed.inject(WorkspaceCommandBoundary) as unknown as { execute: ReturnType<typeof vi.fn> };
    const control = fixture.componentInstance.formSignal()!.controls.name;
    const saved = control.value;
    control.setValue('Temporary edit'); await Promise.resolve();
    control.setValue(saved); await vi.advanceTimersByTimeAsync(700);
    expect(boundary.execute).not.toHaveBeenCalled();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('retains a dirty draft when the routed meter disappears', async () => {
    vi.useFakeTimers();
    const fixture = setup(); fixture.detectChanges();
    const form = fixture.componentInstance.formSignal()!;
    form.controls.name.setValue('Unsaved local name'); await Promise.resolve();
    const selected = TestBed.inject(FacilityMetersWorkspaceService).selectedMeter as WritableSignal<ReturnType<typeof meter> | undefined>;
    selected.set(undefined); fixture.detectChanges();
    expect(fixture.componentInstance.formSignal()).toBe(form);
    expect(form.controls.name.value).toBe('Unsaved local name');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    expect(form.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('draft is retained');
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

  it('derives dependent settings from unsaved form state while calendarization is invalid', async () => {
    vi.useFakeTimers();
    const fixture = setup({ meterReadingDataApplication: undefined });
    const commandBoundary = TestBed.inject(WorkspaceCommandBoundary) as unknown as { execute: ReturnType<typeof vi.fn> };
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const sourceSelect = query<HTMLSelectElement>(fixture, 'select[formControlName="source"]');
    const otherFuelsOption = Array.from(sourceSelect.options)
      .find(option => option.textContent?.trim() === 'Other Fuels');
    expect(otherFuelsOption).toBeDefined();

    sourceSelect.value = otherFuelsOption!.value;
    sourceSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const form = fixture.componentInstance.formSignal();
    expect(form?.controls.source.value).toBe('Other Fuels');
    expect(form?.controls.scope.value).toBe(1);
    expect(form?.controls.startingUnit.value).toBe('CCF');
    expect(form?.controls.energyUnit.value).toBe('MMBtu');
    expect(form?.controls.phase.hasValidator(Validators.required)).toBe(true);
    expect(form?.controls.fuel.hasValidator(Validators.required)).toBe(true);

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-meter-settings-electricity-form')).toBeNull();
    expect(element.querySelector('select[formControlName="phase"]')).not.toBeNull();
    expect(element.querySelector('select[formControlName="fuel"]')).not.toBeNull();
    expect(element.querySelector('input[formControlName="heatCapacity"]')).not.toBeNull();
    expect(element.textContent).not.toContain('Demand Unit');

    await vi.advanceTimersByTimeAsync(700);
    expect(commandBoundary.execute).not.toHaveBeenCalled();

    form?.controls.meterReadingDataApplication.patchValue('backward');
    form?.controls.meterReadingDataApplication.markAsTouched();
    form?.markAsDirty();
    await fixture.componentInstance.saveNow();

    expect(meterHandler.updateMeterWithData).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'Other Fuels',
        scope: 1,
        startingUnit: 'CCF',
        energyUnit: 'MMBtu',
        meterReadingDataApplication: 'backward'
      }),
      [],
      'account-a'
    );
  });

  it('uses a tooltip for the calendarization change warning when readings exist', () => {
    const fixture = setup({ withReading: true });

    fixture.detectChanges();

    const tooltip = query<HTMLElement>(fixture, 'app-meter-settings-reading-form app-ui-tooltip');
    const button = query<HTMLButtonElement>(fixture, 'app-meter-settings-reading-form app-ui-tooltip .v1-tooltip');
    expect(tooltip.textContent).toContain('Changing this affects calendarized reporting results');
    expect(button.getAttribute('aria-label')).toBe('Calendarization change warning');
    expect(button.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('opens and closes the calendarization explanation slideout', () => {
    const fixture = setup({
      readings: [
        reading({ guid: 'reading-a', meterId: 'meter-a', month: 1, day: 15, totalEnergyUse: 100 }),
        reading({ guid: 'reading-b', meterId: 'meter-a', month: 2, day: 15, totalEnergyUse: 200 }),
        reading({ guid: 'reading-c', meterId: 'meter-a', month: 3, day: 15, totalEnergyUse: 300 }),
        reading({ guid: 'reading-d', meterId: 'meter-a', month: 4, day: 15, totalEnergyUse: 400 })
      ]
    });

    fixture.detectChanges();
    query<HTMLButtonElement>(fixture, '.meter-settings-calendarization__help').click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Calendarization example');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Worked allocation');

    query<HTMLButtonElement>(fixture, '.v1-workspace-slideout__header .v1-icon-btn').click();
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

  it('places the lock after meter information and unlocks setup through the analysis-style button', () => {
    const fixture = setup({ withReading: true });

    fixture.detectChanges();
    const sourceSelect = query<HTMLSelectElement>(fixture, 'select[formControlName="source"]');
    expect(sourceSelect.disabled).toBe(true);

    const root = fixture.nativeElement as HTMLElement;
    const core = root.querySelector('app-meter-settings-core-form')!;
    const notice = core.nextElementSibling!;
    expect(notice.classList.contains('meter-settings__setup-lock')).toBe(true);
    expect(notice.textContent).toContain('Setup values are locked');
    const unlock = notice.querySelector('button')!;
    expect(unlock.textContent).toContain('Unlock setup to edit');
    expect(unlock.querySelector('app-ui-icon')?.getAttribute('name')).toBe('lockKeyhole');
    unlock.click(); fixture.detectChanges();

    expect(fixture.componentInstance.changingSetupValues()).toBe(true);
    expect(fixture.componentInstance.formSignal()?.controls.source.disabled).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('does not alter amounts already entered');
  });

  it('keeps the setup unlock action disabled in a read-only workspace with readings', () => {
    const fixture = setup({ withReading: true, canWrite: false }); fixture.detectChanges();
    const unlock = query<HTMLButtonElement>(fixture, '.meter-settings__setup-lock button');
    expect(unlock.disabled).toBe(true); unlock.click(); fixture.detectChanges();
    expect(fixture.componentInstance.changingSetupValues()).toBe(false);
    expect(query<HTMLSelectElement>(fixture, 'select[formControlName="source"]').disabled).toBe(true);
  });

  it('disables the form for read-only workspaces without shifting layout during autosave pending state', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(query<HTMLInputElement>(readOnlyFixture, 'input[formControlName="name"]').disabled).toBe(true);
    expect((readOnlyFixture.nativeElement as HTMLElement).textContent).toContain('read-only');

    TestBed.resetTestingModule();

    const pendingFixture = setup({ hasPending: true });
    pendingFixture.detectChanges();
    expect(query<HTMLInputElement>(pendingFixture, 'input[formControlName="name"]').disabled).toBe(true);
    expect((pendingFixture.nativeElement as HTMLElement).textContent).not.toContain('finishing');
  });

  it('keeps later edits dirty while its own save is pending', async () => {
    const fixture = setup(); fixture.detectChanges();
    const handler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeterWithData: ReturnType<typeof vi.fn> };
    let finish!: (value: ReturnType<typeof meter>) => void;
    handler.updateMeterWithData.mockImplementationOnce(value => new Promise(resolve => { finish = () => resolve(value); }));
    const form = fixture.componentInstance.formSignal()!;
    form.controls.name.setValue('First edit');
    const saving = fixture.componentInstance.saveNow();
    await Promise.resolve();
    fixture.detectChanges();
    expect(query<HTMLInputElement>(fixture, 'input[formControlName="name"]').disabled).toBe(false);
    form.controls.name.setValue('Later edit');
    await Promise.resolve();
    finish(meter({})); await saving;
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    expect(form.controls.name.value).toBe('Later edit');
    fixture.destroy();
  });

  it('opens a delete confirmation from the form footer and deletes the meter', async () => {
    const fixture = setup({ withReading: true });
    const actions = TestBed.inject(MeterActionsService) as unknown as { deleteMeter: ReturnType<typeof vi.fn> };
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
    expect(router.navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', 'meters'], { queryParams: { facility: 'facility-a' } });
  });

  it('protects a pristine deletion globally and releases protection before returning to inventory', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const actions = TestBed.inject(MeterActionsService) as unknown as { deleteMeter: ReturnType<typeof vi.fn> };
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };
    const changes = TestBed.inject(UnsavedChangesService);
    let finish!: () => void;
    actions.deleteMeter.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const canLeave = () => TestBed.runInInjectionContext(() => unsavedChangesGuard(component,
      {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot));
    router.navigate.mockImplementationOnce(async () => {
      expect(canLeave()).toBe(true);
      expect(changes.confirmDiscard()).toBe(true);
      return true;
    });

    expect(component.hasUnsavedChanges()).toBe(false);
    const deleting = component.confirmDeleteMeter();
    fixture.detectChanges(); TestBed.tick();
    expect(canLeave()).toBe(false);
    expect(changes.confirmDiscard()).toBe(false);
    expect(unloadPrevented()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();

    finish();
    await deleting;
    fixture.detectChanges(); TestBed.tick();

    expect(router.navigate).toHaveBeenCalledOnce();
    expect(component.deleting()).toBe(false);
    expect(component.deleteError()).toBeUndefined();
    expect(unloadPrevented()).toBe(false);
  });

  it('releases global deletion protection after a failed deletion', async () => {
    const fixture = setup(); fixture.detectChanges();
    const actions = TestBed.inject(MeterActionsService) as unknown as { deleteMeter: ReturnType<typeof vi.fn> };
    const changes = TestBed.inject(UnsavedChangesService);
    let reject!: (error: Error) => void;
    actions.deleteMeter.mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail; }));
    const deleting = fixture.componentInstance.confirmDeleteMeter();
    fixture.detectChanges(); TestBed.tick();
    expect(changes.confirmDiscard()).toBe(false);
    expect(unloadPrevented()).toBe(true);

    reject(new Error('Deletion failed.')); await deleting;
    fixture.detectChanges(); TestBed.tick();
    expect(fixture.componentInstance.deleteError()).toBe('Deletion failed.');
    expect(changes.confirmDiscard()).toBe(true);
    expect(unloadPrevented()).toBe(false);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('removes global deletion protection when the editor is destroyed', async () => {
    const fixture = setup(); fixture.detectChanges();
    const actions = TestBed.inject(MeterActionsService) as unknown as { deleteMeter: ReturnType<typeof vi.fn> };
    const changes = TestBed.inject(UnsavedChangesService);
    let finish!: () => void;
    actions.deleteMeter.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const deleting = fixture.componentInstance.confirmDeleteMeter();
    fixture.detectChanges(); TestBed.tick();
    expect(changes.confirmDiscard()).toBe(false);
    expect(unloadPrevented()).toBe(true);

    fixture.destroy(); TestBed.tick();
    expect(changes.confirmDiscard()).toBe(true);
    expect(unloadPrevented()).toBe(false);
    finish(); await deleting;
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
    expect(query<HTMLButtonElement>(fixture, '.meter-settings__inactive-toggle').classList.contains('v1-btn--deactivate')).toBe(true);
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
  meter?: Partial<ReturnType<typeof meter>>;
  facility?: Partial<ReturnType<typeof facility>>;
  groups?: ReturnType<typeof group>[];
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
    charges: [],
    ...options.meter
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
    massUnit: 'lb',
    ...options.facility
  }));
  const execute = vi.fn(async (_options, persist: () => Promise<unknown>) => {
    const value = await persist();
    if (value && typeof value === 'object' && 'guid' in value && value.guid === selectedMeter()?.guid) {
      selectedMeter.set(value as ReturnType<typeof meter>);
    }
    return { value, change: { entityKind: 'meter', changeKind: 'update', accountGuid: 'account-a' } };
  });
  const updateMeterWithData = vi.fn(async savedMeter => savedMeter);
  const deleteMeter = vi.fn().mockResolvedValue(undefined);

  TestBed.configureTestingModule({
    declarations: [
      MeterWorkbenchSettingsComponent,
      MeterSettingsFormComponent,
      MeterSettingsChargesFormComponent,
      MeterSettingsCoreFormComponent,
      MeterSettingsElectricityFormComponent,
      MeterSettingsEmissionsDetailsComponent,
      MeterSettingsOtherInfoComponent,
      MeterSettingsReadingFormComponent,
      MeterSettingsVehicleFormComponent
    ],
    imports: [EditorConflictReviewComponent, CommonModule, ReactiveFormsModule, IconsModule, IconComponent, ConfirmDeleteMeterModalComponent, MeterCalendarizationHelpSlideoutComponent, TooltipComponent],
    providers: [
      MeterSettingsFormService,
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          account: activeAccount,
          facility: selectedFacility,
          selectedMeter,
          selectedMeterGuid: () => 'meter-a',
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
          customGWPs: signal([]),
          meters: () => [selectedMeter()],
          meterData: selectedMeterData,
          meterGroups: signal(options.groups ?? []),
          canWrite,
          pendingOperations: signal(options.hasPending ? [{ id: 1, label: 'External operation' }] : [])
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
        provide: MeterActionsService,
        useValue: { deleteMeter }
      },
      {
        provide: ModalPortalService,
        useValue: { show: vi.fn(), hide: vi.fn() }
      },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          openFacilityInventory: (guid: string, resource: string) => TestBed.inject(Router).navigate(['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', resource], { queryParams: { facility: guid } }),
          facilityDataToolRoute: (facilityGuid: string, detail = 'meters') => [
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

function unloadPrevented(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

function selectOptionLabel(fixture: ComponentFixture<unknown>, control: string, label: string): void {
  const select = query<HTMLSelectElement>(fixture, `select[formControlName="${control}"]`);
  select.value = [...select.options].find(option => option.textContent?.trim() === label)!.value;
  select.dispatchEvent(new Event('change'));
}

function optionButton(fixture: ComponentFixture<unknown>, label: string): HTMLButtonElement {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.calendarization-help-choice')
  ).find(option => option.textContent?.includes(label));
  expect(button).toBeDefined();
  return button as HTMLButtonElement;
}

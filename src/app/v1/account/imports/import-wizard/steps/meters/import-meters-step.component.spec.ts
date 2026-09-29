import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';
import { ImportMetersStepComponent } from './import-meters-step.component';

describe('ImportMetersStepComponent', () => {
  it('marks included invalid meters as needing attention', () => {
    const state = createImportWizardStateStub();
    state.meterInvalid.mockReturnValue(true);
    const { fixture } = renderImportStep(ImportMetersStepComponent, state);

    expect(fixture.nativeElement.textContent).toContain('Needs attention');
    expect(fixture.nativeElement.querySelector('tr.invalid-row')).not.toBeNull();
  });

  it('shows the v0 review fields and bulk actions', () => {
    const state = createImportWizardStateStub();
    const { fixture } = renderImportStep(ImportMetersStepComponent, state);
    const text = fixture.nativeElement.textContent;

    ['Facility', 'Meter', 'Is valid?', 'Source', 'Units', 'Group', 'Calendarization', 'New / Existing', 'Include']
      .forEach(label => expect(text).toContain(label));
    expect(text).toContain('Main Plant');
    expect(text).toContain('Electricity');
    expect(text).toContain('kWh');

    const element = fixture.nativeElement as HTMLElement;
    const actions = element.querySelectorAll<HTMLButtonElement>('.meter-review-action');
    expect([...element.querySelectorAll('select')].every(select => select.classList.contains('v1-select'))).toBe(true);
    actions[0].click();
    actions[1].click();
    expect(state.autoGroupMeters).toHaveBeenCalled();
    expect(state.toggleAllMeterCalendarization).toHaveBeenCalled();
  });

  it('allows an invalid row to be excluded and exposes the empty state', () => {
    const state = createImportWizardStateStub();
    state.meterInvalid.mockReturnValue(true);
    const { fixture } = renderImportStep(ImportMetersStepComponent, state);

    const element = fixture.nativeElement as HTMLElement;
    const include = element.querySelector<HTMLInputElement>('input[type="checkbox"]');
    include.checked = false;
    include.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(include.classList.contains('meter-review-checkbox')).toBe(true);
    expect(include.classList.contains('form-check-input')).toBe(false);
    expect(state.toggleMeterIncluded).toHaveBeenCalledWith(0, false);

    state.draft.update((draft: any) => ({ ...draft, meters: [] }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No meters are included in this workbook.');
  });

  it('opens the large meter editor and cancels without committing', () => {
    const state = createImportWizardStateStub();
    const { fixture } = renderImportStep(ImportMetersStepComponent, state);

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.meter-review-name').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-import-meter-editor')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Edit Electricity');
    expect(fixture.nativeElement.textContent).toContain('Match this import to an existing meter');
    const matchTooltip = element.querySelector<HTMLElement>('.import-meter-editor__existing app-ui-tooltip');
    expect(matchTooltip).not.toBeNull();
    expect(matchTooltip?.querySelector('button')?.getAttribute('aria-label')).toBe('Why match an existing meter?');
    expect(matchTooltip?.textContent).toContain('different or mistyped name');
    expect(matchTooltip?.textContent).toContain('readings will be assigned to the selected meter');
    expect([...element.querySelectorAll('select')].every(select => select.classList.contains('v1-select'))).toBe(true);
    const settings = element.querySelector<HTMLElement>('.meter-settings');
    const readingSettings = element.querySelector('app-meter-settings-reading-form');
    const charges = element.querySelector('app-meter-settings-charges-form');
    const otherInformation = element.querySelector('app-meter-settings-other-info');
    expect(settings.classList.contains('meter-settings--single-column')).toBe(true);
    expect(readingSettings.compareDocumentPosition(charges) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(charges.compareDocumentPosition(otherInformation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    element.querySelector<HTMLButtonElement>('.import-meter-editor__actions .v1-btn--secondary').click();
    fixture.detectChanges();
    expect(state.saveMeter).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-import-meter-editor')).toBeNull();
  });

  it('keeps an invalid editor open and does not commit its draft', () => {
    const state = createImportWizardStateStub();
    state.draft().meters[0].meterReadingDataApplication = undefined;
    const { fixture } = renderImportStep(ImportMetersStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.meter-review-name').click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.import-meter-editor__actions .v1-btn--action').click();
    fixture.detectChanges();

    expect(state.saveMeter).not.toHaveBeenCalled();
    expect(element.querySelector('app-import-meter-editor')).not.toBeNull();
    expect(element.textContent).toContain('Resolve validation issues before saving this meter.');
  });

  it('commits a valid existing-meter match only when Save is selected', () => {
    const state = createImportWizardStateStub();
    const original = state.draft().meters[0];
    const existing = { ...structuredClone(original), id: 7, guid: 'existing-meter', name: 'Existing electricity' };
    state.availableExistingMeters.mockReturnValue([existing]);
    const { fixture } = renderImportStep(ImportMetersStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.meter-review-name').click();
    fixture.detectChanges();
    const existingSelect = element.querySelector<HTMLSelectElement>('.import-meter-editor__existing select');
    existingSelect.value = existing.guid;
    existingSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.import-meter-editor__actions .v1-btn--action').click();
    fixture.detectChanges();

    expect(state.saveMeter).toHaveBeenCalledWith(
      original.guid,
      expect.objectContaining({
        id: existing.id,
        guid: existing.guid,
        importWizardName: original.importWizardName
      })
    );
    expect(element.querySelector('app-import-meter-editor')).toBeNull();
  });
});

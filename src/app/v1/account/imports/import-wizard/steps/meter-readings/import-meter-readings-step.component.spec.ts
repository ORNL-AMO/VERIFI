import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';
import { ImportMeterReadingsStepComponent } from './import-meter-readings-step.component';

describe('ImportMeterReadingsStepComponent', () => {
  it('shows the meter reading summary fields and accessible empty states', () => {
    const state = createImportWizardStateStub();
    const { fixture } = renderImportStep(ImportMeterReadingsStepComponent, state);
    const text = fixture.nativeElement.textContent;

    ['Facility', 'Meter', 'New readings', 'Invalid readings', 'Existing readings', 'Keep current readings?']
      .forEach(label => expect(text).toContain(label));
    expect(text).toContain('1 reading found');
    expect(text).toContain('Main Plant');

    state.draft.update((draft: any) => ({ ...draft, meterData: [] }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No meter readings were found for the included meters.');

    state.draft.update((draft: any) => ({ ...draft, meters: draft.meters.map((meter: any) => ({ ...meter, skipImport: true })) }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No meters are included in this workbook.');
  });

  it('reviews invalid readings per meter and keeps the global acknowledgement visible', () => {
    const state = createImportWizardStateStub();
    state.draft().meterData[0].month = 13;
    const { fixture } = renderImportStep(ImportMeterReadingsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('1 needs attention');
    expect(element.textContent).toContain('Invalid readings are never silently uploaded');
    expect(element.textContent).toContain('I acknowledge that excluded readings will not be uploaded');

    element.querySelector<HTMLButtonElement>('.meter-reading-action')?.click();
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).not.toBeNull();
    expect(element.textContent).toContain('Review invalid readings: Electricity');
    expect(element.textContent).toContain('Month must be between 1 and 12.');

    const exclusion = element.querySelector<HTMLInputElement>('.reading-review-table--invalid input[type="checkbox"]');
    exclusion.checked = true;
    exclusion.dispatchEvent(new Event('change'));
    const acknowledgement = element.querySelector<HTMLInputElement>('.meter-reading-acknowledgement input[type="checkbox"]');
    acknowledgement.checked = true;
    acknowledgement.dispatchEvent(new Event('change'));

    expect(state.toggleExcludedReading).toHaveBeenCalledWith(0, true);
    expect(state.setInvalidMeterReadingsAcknowledged).toHaveBeenCalledWith(true);
  });

  it('opens a large comparison slideout for changed same-date readings', () => {
    const state = createImportWizardStateStub();
    state.workspace.meterData.set([{
      ...structuredClone(state.draft().meterData[0]),
      guid: 'current-reading',
      totalEnergyUse: 10,
      totalCost: 4
    }]);
    state.draft().meterData[0].totalEnergyUse = 12;
    state.draft().meterData[0].totalCost = 6;
    const { fixture } = renderImportStep(ImportMeterReadingsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Compare changes');
    expect(element.querySelector<HTMLButtonElement>('[aria-label="About keeping current readings"]')).not.toBeNull();
    element.querySelector<HTMLButtonElement>('.meter-reading-action--comparison')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.v1-workspace-slideout--large')).not.toBeNull();
    expect(element.textContent).toContain('Compare meter readings: Electricity');
    expect(element.textContent).toContain('Current usage');
    expect(element.textContent).toContain('Uploaded usage');
    expect(element.textContent).toContain('Total cost');
    expect(element.querySelector('th[aria-sort="descending"]')?.textContent).toContain('Read date');

    const importedSort = [...element.querySelectorAll<HTMLButtonElement>('.reading-review-sort')]
      .find(button => button.textContent?.includes('Uploaded usage'));
    importedSort?.click();
    fixture.detectChanges();
    expect(importedSort?.closest('th')?.getAttribute('aria-sort')).toBe('ascending');

    element.querySelector<HTMLButtonElement>('.v1-icon-btn')?.click();
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('supports bulk and per-meter keep-current decisions with an indeterminate bulk state', () => {
    const state = createImportWizardStateStub();
    const firstMeter = state.draft().meters[0];
    const secondMeter = { ...structuredClone(firstMeter), guid: 'meter-2', name: 'Electricity 2' };
    const firstReading = state.draft().meterData[0];
    const secondReading = { ...structuredClone(firstReading), guid: 'reading-2', meterId: secondMeter.guid };
    state.draft.update((draft: any) => ({
      ...draft,
      meters: [firstMeter, secondMeter],
      meterData: [firstReading, secondReading],
      skipExistingReadingsMeterIds: [firstMeter.guid]
    }));
    state.workspace.meterData.set([
      { ...structuredClone(firstReading), guid: 'current-1' },
      { ...structuredClone(secondReading), guid: 'current-2' }
    ]);
    const { fixture } = renderImportStep(ImportMeterReadingsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;
    const bulk = element.querySelector<HTMLInputElement>('.meter-reading-bulk-control input');

    expect(bulk.indeterminate).toBe(true);
    bulk.checked = true;
    bulk.dispatchEvent(new Event('change'));
    const rowDecision = element.querySelector<HTMLInputElement>('.meter-reading-keep input');
    rowDecision.checked = false;
    rowDecision.dispatchEvent(new Event('change'));

    expect(state.setAllSkipExistingMeterReadings).toHaveBeenCalledWith(true);
    expect(state.setSkipExistingMeterReadings).toHaveBeenCalledWith(firstMeter.guid, false);
  });
});

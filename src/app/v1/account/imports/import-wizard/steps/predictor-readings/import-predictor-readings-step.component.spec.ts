import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';
import { ImportPredictorReadingsStepComponent } from './import-predictor-readings-step.component';

describe('ImportPredictorReadingsStepComponent', () => {
  it('shows the predictor reading summary fields and accessible empty states', () => {
    const state = createImportWizardStateStub();
    const { fixture } = renderImportStep(ImportPredictorReadingsStepComponent, state);
    const text = fixture.nativeElement.textContent;

    ['Facility', 'Predictor', 'New readings', 'Invalid readings', 'Existing readings', 'Keep current readings?']
      .forEach(label => expect(text).toContain(label));
    expect(text).toContain('1 reading found');
    expect(text).toContain('Main Plant');

    state.draft.update(draft => ({ ...draft, predictorData: [] }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No predictor readings were found for the included predictors.');

    state.draft.update(draft => ({
      ...draft,
      predictors: draft.predictors.map(predictor => ({ ...predictor, skipImport: true }))
    }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No predictors are included in this workbook.');
  });

  it('opens a sortable large comparison slideout for changed same-month readings', () => {
    const state = createImportWizardStateStub();
    state.workspace.predictorData.set([{
      ...structuredClone(state.draft().predictorData[0]),
      guid: 'current-reading',
      amount: 10
    }]);
    state.draft().predictorData[0].amount = 12;
    state.draft().predictors[0].predictorType = 'Weather';
    const { fixture } = renderImportStep(ImportPredictorReadingsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Compare changes');
    expect(element.querySelector<HTMLButtonElement>('[aria-label="About keeping current predictor readings"]')).not.toBeNull();
    element.querySelector<HTMLButtonElement>('.predictor-reading-action--comparison')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.v1-workspace-slideout--large')).not.toBeNull();
    expect(element.textContent).toContain('Compare predictor readings: Production');
    expect(element.textContent).toContain('Current value');
    expect(element.textContent).toContain('Uploaded value');
    expect(element.textContent).toContain('manual overrides');
    expect(element.querySelector('th[aria-sort="descending"]')?.textContent).toContain('Month');

    const importedSort = [...element.querySelectorAll<HTMLButtonElement>('.predictor-reading-review-sort')]
      .find(button => button.textContent?.includes('Uploaded value'));
    importedSort?.click();
    fixture.detectChanges();
    expect(importedSort?.closest('th')?.getAttribute('aria-sort')).toBe('ascending');

    element.querySelector<HTMLButtonElement>('.v1-icon-btn')?.click();
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('reviews invalid readings per predictor and keeps the acknowledgement visible', () => {
    const state = createImportWizardStateStub();
    state.draft().predictorData[0].month = 13;
    const { fixture } = renderImportStep(ImportPredictorReadingsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('1 needs attention');
    expect(element.textContent).toContain('Invalid predictor readings are never silently uploaded');
    expect(element.textContent).toContain('excluded predictor readings will not be uploaded');

    element.querySelector<HTMLButtonElement>('.predictor-reading-action')?.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Review invalid readings: Production');
    expect(element.textContent).toContain('Month must be between 1 and 12.');

    const exclusion = element.querySelector<HTMLInputElement>('.predictor-reading-review-table--invalid input[type="checkbox"]');
    exclusion.checked = true;
    exclusion.dispatchEvent(new Event('change'));
    const acknowledgement = element.querySelector<HTMLInputElement>('.predictor-reading-acknowledgement input[type="checkbox"]');
    acknowledgement.checked = true;
    acknowledgement.dispatchEvent(new Event('change'));

    expect(state.predictorState.toggleExcludedReading).toHaveBeenCalledWith(0, true);
    expect(state.predictorState.setInvalidReadingsAcknowledged).toHaveBeenCalledWith(true);
  });

  it('supports bulk and per-predictor keep-current decisions with an indeterminate bulk state', () => {
    const state = createImportWizardStateStub();
    const firstPredictor = state.draft().predictors[0];
    const secondPredictor = { ...structuredClone(firstPredictor), id: 2, guid: 'predictor-2', name: 'Occupancy' };
    const firstReading = state.draft().predictorData[0];
    const secondReading = { ...structuredClone(firstReading), guid: 'predictor-reading-2', predictorId: secondPredictor.guid };
    state.draft.update(draft => ({
      ...draft,
      predictors: [firstPredictor, secondPredictor],
      predictorData: [firstReading, secondReading],
      skipExistingPredictorIds: [firstPredictor.guid]
    }));
    state.workspace.predictorData.set([
      { ...structuredClone(firstReading), guid: 'current-1' },
      { ...structuredClone(secondReading), guid: 'current-2' }
    ]);
    const { fixture } = renderImportStep(ImportPredictorReadingsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;
    const bulk = element.querySelector<HTMLInputElement>('.predictor-reading-bulk-control input');

    expect(bulk.indeterminate).toBe(true);
    bulk.checked = true;
    bulk.dispatchEvent(new Event('change'));
    const rowDecision = element.querySelector<HTMLInputElement>('.predictor-reading-keep input');
    rowDecision.checked = false;
    rowDecision.dispatchEvent(new Event('change'));

    expect(state.predictorState.setAllSkipExistingReadings).toHaveBeenCalledWith(true);
    expect(state.predictorState.setSkipExistingReadings).toHaveBeenCalledWith(firstPredictor.guid, false);
  });
});

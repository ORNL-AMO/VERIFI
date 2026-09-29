import { ImportReviewStepComponent } from './import-review-step.component';
import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';

describe('ImportReviewStepComponent', () => {
  it('summarizes every entity category before commit', () => {
    const { fixture } = renderImportStep(ImportReviewStepComponent);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Meter readings');
    expect(text).toContain('Predictor readings');
    expect(text).toContain('Energy-use groups');
    expect(text).toContain('Equipment');
  });

  it('counts only predictor readings that will be written', () => {
    const state = createImportWizardStateStub();
    state.workspace.predictorData.set([{
      ...structuredClone(state.draft().predictorData[0]),
      guid: 'current-predictor-reading'
    }]);
    state.draft.update((draft: any) => ({
      ...draft,
      skipExistingPredictorIds: [draft.predictors[0].guid]
    }));

    const { fixture } = renderImportStep(ImportReviewStepComponent, state);
    const predictorValue = [...fixture.nativeElement.querySelectorAll('div')]
      .find((row: HTMLElement) => row.querySelector('dt')?.textContent === 'Predictor readings')
      ?.querySelector('dd')?.textContent;

    expect(predictorValue).toBe('0');
  });
});

import { ImportPredictorsStepComponent } from './import-predictors-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportPredictorsStepComponent', () => {
  it('shows whether a predictor will be added or updated', () => {
    const { fixture } = renderImportStep(ImportPredictorsStepComponent);

    expect(fixture.nativeElement.textContent).toContain('Production');
    expect(fixture.nativeElement.textContent).toContain('Update');
  });
});

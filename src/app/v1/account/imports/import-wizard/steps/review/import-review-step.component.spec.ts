import { ImportReviewStepComponent } from './import-review-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportReviewStepComponent', () => {
  it('summarizes every entity category before commit', () => {
    const { fixture } = renderImportStep(ImportReviewStepComponent);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Meter readings');
    expect(text).toContain('Predictor readings');
    expect(text).toContain('Energy-use groups');
    expect(text).toContain('Equipment');
  });
});

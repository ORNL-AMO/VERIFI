import { ImportPredictorReadingsStepComponent } from './import-predictor-readings-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportPredictorReadingsStepComponent', () => {
  it('shows the reading total and per-facility existing-data decision', () => {
    const { fixture } = renderImportStep(ImportPredictorReadingsStepComponent);

    expect(fixture.nativeElement.textContent).toContain('1 predictor readings found');
    expect(fixture.nativeElement.textContent).toContain('Keep existing predictor readings for Main Plant');
  });
});

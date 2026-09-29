import { ImportColumnsStepComponent } from './import-columns-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportColumnsStepComponent', () => {
  it('shows the detected date range and available column roles', () => {
    const { fixture } = renderImportStep(ImportColumnsStepComponent);

    expect(fixture.nativeElement.textContent).toContain('1/1/2026 – 1/1/2026');
    expect(fixture.nativeElement.textContent).toContain('Predictors');
  });
});

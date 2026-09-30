import { ImportColumnsStepComponent } from './import-columns-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportColumnsStepComponent', () => {
  it('shows the classification board and available column roles', () => {
    const { fixture } = renderImportStep(ImportColumnsStepComponent);

    expect(fixture.nativeElement.textContent).not.toContain('Classify workbook columns');
    expect(fixture.nativeElement.textContent).toContain('Not imported');
    expect(fixture.nativeElement.textContent).toContain('Electricity');
    expect(fixture.nativeElement.textContent).toContain('Likely date');
    expect(fixture.nativeElement.textContent).toContain('Predictors');
    expect(fixture.nativeElement.querySelectorAll('app-import-column-lane')).toHaveLength(4);
  });

  it('offers lane-based bulk actions and non-drag move controls', () => {
    const { fixture } = renderImportStep(ImportColumnsStepComponent);

    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('select')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Select all columns');
    expect(fixture.nativeElement.textContent).not.toContain('Move selected to');
    expect(fixture.nativeElement.querySelectorAll('button[aria-label^="Move selected columns to"]')).toHaveLength(4);
  });
});

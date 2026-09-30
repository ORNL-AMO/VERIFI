import { ImportWorksheetStepComponent } from './import-worksheet-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportWorksheetStepComponent', () => {
  it('shows the selected worksheet preview and row count', () => {
    const { fixture } = renderImportStep(ImportWorksheetStepComponent);

    expect(fixture.nativeElement.textContent).toContain('1 data rows found');
    expect(fixture.nativeElement.textContent).toContain('Electricity');
  });
});

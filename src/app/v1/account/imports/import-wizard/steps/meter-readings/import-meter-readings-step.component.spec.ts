import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';
import { ImportMeterReadingsStepComponent } from './import-meter-readings-step.component';

describe('ImportMeterReadingsStepComponent', () => {
  it('requires an explicit exclusion decision for invalid readings', () => {
    const state = createImportWizardStateStub();
    state.invalidReadingCount.set(1);
    state.readingInvalid.mockReturnValue(true);
    const { fixture } = renderImportStep(ImportMeterReadingsStepComponent, state);

    expect(fixture.nativeElement.textContent).toContain('Invalid readings are never silently imported');
    expect(fixture.nativeElement.textContent).toContain('I acknowledge that excluded readings will not be imported');
  });
});

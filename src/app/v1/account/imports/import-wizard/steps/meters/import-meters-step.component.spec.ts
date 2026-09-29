import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';
import { ImportMetersStepComponent } from './import-meters-step.component';

describe('ImportMetersStepComponent', () => {
  it('marks included invalid meters as needing attention', () => {
    const state = createImportWizardStateStub();
    state.meterInvalid.mockReturnValue(true);
    const { fixture } = renderImportStep(ImportMetersStepComponent, state);

    expect(fixture.nativeElement.textContent).toContain('Needs attention');
    expect(fixture.nativeElement.querySelector('tr.invalid-row')).not.toBeNull();
  });
});

import { ImportFacilitiesStepComponent } from './import-facilities-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportFacilitiesStepComponent', () => {
  it('describes whether each facility will be created or updated', () => {
    const { fixture } = renderImportStep(ImportFacilitiesStepComponent);

    expect(fixture.nativeElement.textContent).toContain('Main Plant');
    expect(fixture.nativeElement.textContent).toContain('Create facility');
  });
});

import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';
import { ImportEquipmentStepComponent } from './import-equipment-step.component';

describe('ImportEquipmentStepComponent', () => {
  it('disables a meter group when its energy source already has a link', () => {
    const state = createImportWizardStateStub();
    state.meterGroupSourceConflict.mockReturnValue(true);
    const { fixture } = renderImportStep(ImportEquipmentStepComponent, state);

    expect(fixture.nativeElement.textContent).toContain('source already linked');
    expect(fixture.nativeElement.querySelector('input').disabled).toBe(true);
  });
});

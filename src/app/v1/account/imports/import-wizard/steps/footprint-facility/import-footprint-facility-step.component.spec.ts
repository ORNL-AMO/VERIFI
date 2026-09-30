import { ImportFootprintFacilityStepComponent } from './import-footprint-facility-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportFootprintFacilityStepComponent', () => {
  it('offers the facilities in the active account', () => {
    const { fixture } = renderImportStep(ImportFootprintFacilityStepComponent);

    expect(fixture.nativeElement.textContent).toContain('Upload energy uses into');
    expect(fixture.nativeElement.textContent).toContain('Main Plant');
    expect(fixture.nativeElement.querySelector('select').classList.contains('v1-select')).toBe(true);
  });
});

import { ImportMappingStepComponent } from './import-mapping-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportMappingStepComponent', () => {
  it('renders the connected meter mapping board with v1 controls', () => {
    const { fixture, state } = renderImportStep(ImportMappingStepComponent, undefined, { mappingType: 'meter' });

    expect(state.mappingBoard).toHaveBeenCalledWith('meter');
    expect(fixture.nativeElement.textContent).toContain('Electricity');
    expect(fixture.nativeElement.textContent).toContain('Main Plant');
    expect(fixture.nativeElement.querySelectorAll('app-import-mapping-lane').length).toBe(2);
    expect(fixture.nativeElement.querySelector('input.v1-input')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('select').classList.contains('v1-select')).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('sample');
  });

  it('places Add new facility beneath the existing facility lanes', () => {
    const { fixture } = renderImportStep(ImportMappingStepComponent, undefined, { mappingType: 'meter' });
    const facilities = fixture.nativeElement.querySelector('.mapping-board__facilities') as HTMLElement;
    const lanes = facilities.querySelector('.mapping-board__facility-lanes') as HTMLElement;
    const addFacility = facilities.querySelector('.mapping-add-facility') as HTMLElement;

    expect(addFacility.textContent).toContain('Add new facility');
    const input = addFacility.querySelector('input') as HTMLInputElement;
    expect(input.classList.contains('v1-input')).toBe(true);
    expect(input.placeholder).toBe('Facility name');
    expect(addFacility.querySelector('app-ui-icon[name="facility"]')).toBeTruthy();
    expect(lanes.compareDocumentPosition(addFacility) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

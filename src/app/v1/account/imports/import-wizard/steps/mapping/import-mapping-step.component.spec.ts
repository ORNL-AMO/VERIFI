import { ImportMappingStepComponent } from './import-mapping-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportMappingStepComponent', () => {
  it('uses route data to render meter facility mappings', () => {
    const { fixture, state } = renderImportStep(ImportMappingStepComponent, undefined, { mappingType: 'meter' });

    expect(state.mappingItems).toHaveBeenCalledWith('meter');
    expect(fixture.nativeElement.textContent).toContain('Electricity');
    expect(fixture.nativeElement.textContent).toContain('Main Plant');
  });
});

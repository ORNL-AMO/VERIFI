import { ImportFootprintFacilityStepComponent } from './import-footprint-facility-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportFootprintFacilityStepComponent', () => {
  it('offers active-account facility cards and passes the selected facility without a native select', () => {
    const { fixture, state } = renderImportStep(ImportFootprintFacilityStepComponent);
    expect(fixture.nativeElement.textContent).toContain('Upload energy uses into');
    const card = fixture.nativeElement.querySelector('.creation-choice') as HTMLButtonElement;
    expect(card.textContent).toContain('Main Plant');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    card.click(); fixture.detectChanges();
    expect(state.setFootprintFacility).toHaveBeenCalledWith('facility-1');
    expect(card.getAttribute('aria-pressed')).toBe('true');
    fixture.componentInstance.search.setValue('no matches'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No matching facilities.');
  });
});

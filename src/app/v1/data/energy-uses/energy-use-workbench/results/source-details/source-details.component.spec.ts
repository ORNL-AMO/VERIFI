import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../../energy-uses.module';
import { buildEnergyUseResults } from '../../../models/energy-use-results.models';
import { energyUseFacility } from '../../../energy-uses.testing';
import { resultsEquipment } from '../energy-use-results.testing';
import { SourceDetailsComponent } from './source-details.component';

describe('Energy Use source details', () => {
  it('shows saved value, origin year and manual override for carried consumption', () => {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const fixture = TestBed.createComponent(SourceDetailsComponent);
    const item = resultsEquipment(); item.operatingConditionsData = [{ year: 2024 } as never];
    const result = buildEnergyUseResults([item], { ...energyUseFacility(), energyUnit: 'kWh', fiscalYear: 'calendarYear' }).at(-1)!;
    fixture.componentRef.setInput('sources', result.items[0].projection.sources); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carried forward from FY 2022 · Manual override');
    expect(fixture.nativeElement.textContent).toContain('100 kWh');
    expect(fixture.nativeElement.textContent).toContain('Saved: 100 kWh · FY 2022');
  });
});

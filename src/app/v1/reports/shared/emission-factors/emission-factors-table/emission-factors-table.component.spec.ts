import { TestBed } from '@angular/core/testing';
import { buildEmissionFactorsInput, calculateEmissionFactors } from '@domain/reports/emission-factors/emission-factors-report';
import { emissionFactorsRates, emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { EmissionFactorsModule } from '../emission-factors.module';
import { EmissionFactorsTableComponent } from './emission-factors-table.component';

describe('shared emission-factor tables', () => {
  it('renders prepared factors with legacy precision/units and responds to changed facility inputs', async () => {
    await TestBed.configureTestingModule({ imports: [EmissionFactorsModule] }).compileComponents();
    const fixture = TestBed.createComponent(EmissionFactorsTableComponent), snapshot = emissionFactorsSnapshot();
    const input = buildEmissionFactorsInput(snapshot, 'facility', { startYear: 2022, endYear: 2024 }, emissionFactorsRates());
    fixture.componentRef.setInput('result', calculateEmissionFactors(input)); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('100.123'); expect(root.textContent).not.toContain('100.123456');
    expect(root.textContent).toContain('53.06 g CO₂/MMBtu');
    expect(root.querySelectorAll('table')).toHaveLength(2);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(4);
    fixture.componentRef.setInput('category', 'electricity'); fixture.detectChanges();
    expect(root.querySelectorAll('table')).toHaveLength(1);
    expect(root.querySelector('caption')?.textContent).toContain('Electricity emission factors');
    fixture.componentRef.setInput('category', 'other'); fixture.detectChanges();
    expect(root.querySelectorAll('table')).toHaveLength(1);
    expect(root.querySelector('caption')?.textContent).toContain('Other emission factors');
    fixture.componentRef.setInput('result', { facility: { ...input.facility, guid: 'other-facility' }, electricityMeters: [], electricity: [], other: [
      { meterGuid: 'missing', meterName: 'Missing fuel', source: 'Other Fuels', fuelValue: '', unit: 'gal', CO2: 0, unavailable: 'Fuel unavailable' }
    ] }); fixture.detectChanges();
    expect(root.textContent).not.toContain('Purchased electricity'); expect(root.textContent).toContain('Fuel unavailable');
    expect(root.querySelectorAll('tbody td')[2].textContent).toBe('—');
  });
});

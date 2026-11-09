import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../../energy-uses.module';
import { energyUseSource } from '../../../energy-uses.testing';
import { resultsEquipment, resultsTestContext } from '../energy-use-results.testing';
import { FootprintTableComponent } from './footprint-table.component';

describe('Group footprint source table', () => {
  it('groups equipment by source with linked names, source icons and subtotals for the latest year', () => {
    const burner = { ...resultsEquipment('burner', 2022, 100), name: 'Burner', utilityData: [
      energyUseSource({ energySource: 'Natural Gas', energyUse: [{ year: 2022, energyUse: 100, energyUseUnit: 'kWh', overrideEnergyUse: true }] }),
      energyUseSource({ energySource: 'Natural Gas', energyUse: [{ year: 2024, energyUse: 3.6, energyUseUnit: 'MJ', overrideEnergyUse: true }] })
    ] };
    const setup = resultsTestContext([burner, { ...resultsEquipment('fan', 2024, 50), name: 'Fan' }]);
    const before = JSON.stringify(setup.store.snapshot());
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: setup.providers });
    const fixture = TestBed.createComponent(FootprintTableComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.groups().map(group => [group.source, group.total, group.icon])).toEqual([
      ['Natural Gas', 101, 'naturalGas'], ['Electricity', 50, 'electricity']
    ]);
    expect(fixture.nativeElement.querySelectorAll('.energy-use-footprint-table__item')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('tbody a').getAttribute('href')).toContain('/group-a/items/burner');
    expect(fixture.nativeElement.querySelector('.energy-use-footprint-table__total').textContent).toContain('Total Natural Gas');
    expect(component.groups().map(group => group.total)).toEqual([101, 50]);
    expect(fixture.nativeElement.querySelector('caption').textContent).toContain('FY 2024');
    expect(JSON.stringify(setup.store.snapshot())).toBe(before);
  });

  it('retains zero and unavailable sources, and labels partial subtotals instead of treating missing values as zero', () => {
    const partial = resultsEquipment('partial', 2024, 20);
    partial.utilityData.push(energyUseSource({ energyUse: [] }));
    const zero = resultsEquipment('zero', 2024, 0);
    zero.utilityData[0].energySource = 'Natural Gas';
    const setup = resultsTestContext([partial, zero]);
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: setup.providers });
    const fixture = TestBed.createComponent(FootprintTableComponent); fixture.detectChanges();
    expect(fixture.componentInstance.groups().map(group => [group.source, group.total, group.partial])).toEqual([
      ['Electricity', 20, true], ['Natural Gas', 0, false]
    ]);
    expect(fixture.nativeElement.textContent).toContain('Partial coverage · known values only');
    expect(fixture.nativeElement.querySelectorAll('tbody')[1].querySelector('.energy-use-footprint-table__item td').textContent.trim()).toMatch(/^0(?:\s|$)/);
  });
});

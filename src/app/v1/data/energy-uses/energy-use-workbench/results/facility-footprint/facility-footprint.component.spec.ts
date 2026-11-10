import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EnergyUsesModule } from '../../../energy-uses.module';
import { energyUseSource } from '../../../energy-uses.testing';
import { BalanceFactsComponent } from '../../balance-facts/balance-facts.component';
import { resultsEquipment, resultsTestContext } from '../energy-use-results.testing';
import { FacilityEnergyUseBalanceService } from './facility-energy-use-balance.service';
import { FacilityFootprintComponent } from './facility-footprint.component';

describe('Facility Footprint tab', () => {
  it('updates committed equipment after a terminal meter error and removes the old balance from the footprint and facts', () => {
    const setup = resultsTestContext([resultsEquipment('saved', 2025, 100)]);
    const state = signal<'ready' | 'evaluating' | 'error'>('ready');
    const retry = vi.fn(() => state.set('evaluating'));
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [...setup.providers,
      { provide: FacilityEnergyUseBalanceService, useValue: { state, meters: () => [], readings: () => [], retry } }] });
    const fixture = TestBed.createComponent(FacilityFootprintComponent), facts = TestBed.createComponent(BalanceFactsComponent);
    fixture.detectChanges(); facts.detectChanges();
    expect(fixture.componentInstance.result()?.total).toBe(100);
    expect(fixture.nativeElement.querySelector('.facility-footprint__balance')).not.toBeNull();
    expect(facts.nativeElement.querySelector('dl')).not.toBeNull();
    state.set('error'); fixture.detectChanges(); facts.detectChanges();
    const original = setup.store.snapshot()!;
    setup.store.publish({ ...original, energyUseEquipment: [resultsEquipment('saved', 2025, 250)] });
    fixture.detectChanges(); facts.detectChanges();
    expect(fixture.componentInstance.result()?.total).toBe(250);
    expect(fixture.nativeElement.querySelector('tfoot').textContent).toContain('250');
    expect(fixture.componentInstance.sources()[0].groups[0].amount).toBe(250);
    expect(fixture.componentInstance.balance()).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.facility-footprint__balance')).toBeNull();
    expect(facts.nativeElement.querySelector('dl')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Equipment results remain available');
    expect(fixture.componentInstance.calculationStatus().label).toBe('Unavailable');
    fixture.nativeElement.querySelector('button').click(); fixture.detectChanges(); facts.detectChanges();
    expect(retry).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.result()?.total).toBe(250);
    expect(fixture.componentInstance.balance()).toBeUndefined();
    state.set('ready'); fixture.detectChanges(); facts.detectChanges();
    expect(fixture.componentInstance.balance()?.equipment).toBe(250);
    expect(facts.nativeElement.querySelector('dl').textContent).toMatch(/Equipment Use\s*250/);
  });

  it('shows every facility group at the same year, keeps facility scope on group switching and links to group footprints', () => {
    const setup = resultsTestContext([resultsEquipment('older', 2022, 100),
      { ...resultsEquipment('other', 2025, 50), energyUseGroupId: 'other' },
      { ...resultsEquipment('orphan', 2024, 10), energyUseGroupId: 'deleted' },
      { ...resultsEquipment('foreign', 2099, 1000), facilityId: 'facility-b' }]);
    const before = JSON.stringify(setup.store.snapshot());
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: setup.providers });
    const fixture = TestBed.createComponent(FacilityFootprintComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.result()).toMatchObject({ year: 2025, total: 160 });
    expect(fixture.nativeElement.querySelectorAll('.facility-footprint__group')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('tfoot').textContent).toContain('160');
    expect(fixture.nativeElement.querySelector('tbody a').getAttribute('href')).toContain('/groups/unavailable/group-footprint');
    expect(fixture.nativeElement.querySelector('select, input')).toBeNull();
    setup.groupGuid.set('other'); fixture.detectChanges();
    expect(component.result()).toMatchObject({ year: 2025, total: 160 });
    expect(JSON.stringify(setup.store.snapshot())).toBe(before);
  });

  it('shows zero and missing values and distinguishes empty/no-year/invalid-calendar states', () => {
    const setup = resultsTestContext([resultsEquipment('zero', 2025, 0),
      { ...resultsEquipment('missing'), energyUseGroupId: 'other', utilityData: [energyUseSource({ energyUse: [] })] }]);
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: setup.providers });
    const fixture = TestBed.createComponent(FacilityFootprintComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No positive consumption to chart');
    expect(fixture.nativeElement.textContent).toContain('Unavailable');
    expect(fixture.nativeElement.textContent).toContain('Partial coverage');
    const current = setup.store.snapshot()!;
    setup.store.publish({ ...current, facilities: current.facilities.map(row => ({ ...row, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 99 })) }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('facility fiscal calendar is invalid');
    setup.store.publish({ ...current, energyUseEquipment: [{ ...resultsEquipment(), utilityData: [], operatingConditionsData: [] }] }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No saved annual data');
    setup.store.publish({ ...current, energyUseEquipment: [] }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No energy uses in this facility');
    setup.groupGuid.set('deleted'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('facility footprint is unavailable');
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { resultsEquipment, resultsTestContext } from '../energy-use-results.testing';
import { FacilityEnergyUseBalanceService } from './facility-energy-use-balance.service';
import { FacilityEnergyUseResultsService } from './facility-energy-use-results.service';

function setup() {
  const context = resultsTestContext([resultsEquipment('saved', 2025, 100)]);
  const state = signal<'ready' | 'idle' | 'evaluating' | 'error'>('ready');
  TestBed.configureTestingModule({ providers: [...context.providers,
    { provide: FacilityEnergyUseBalanceService, useValue: { state, meters: () => [], readings: () => [] } }] });
  return { ...context, state, results: TestBed.inject(FacilityEnergyUseResultsService) };
}

describe('facility results presentation during refresh', () => {
  it('retains one coherent display through loading/evaluation and replaces it when refreshed results are ready', () => {
    const { store, state, results } = setup(), original = store.snapshot()!;
    const display = results.display();
    expect(display?.balance?.equipment).toBe(100);
    store.beginLoad(false); state.set('idle');
    expect(results.display()).toBe(display); expect(results.calculationStatus().label).toBe('Calculating');
    store.publish({ ...original, energyUseEquipment: [resultsEquipment('new', 2026, 250)] }); state.set('evaluating');
    expect(results.display()).toBe(display); expect(results.display()?.year).toBe(2025);
    state.set('ready');
    expect(results.display()?.balance?.equipment).toBe(250); expect(results.display()?.year).toBe(2026);
    expect(results.calculationStatus().label).toBe('Updated');
    state.set('error'); expect(results.display()?.result?.total).toBe(250);
    expect(results.display()?.balance).toBeUndefined();
    expect(results.calculationStatus().label).toBe('Unavailable');
  });
  it('clears cached values when units/calendar/ownership change, and accepts a completed empty result', () => {
    const { store, state, results } = setup(), original = store.snapshot()!;
    expect(results.display()?.balance?.equipment).toBe(100); state.set('evaluating');
    store.publish({ ...original, facilities: original.facilities.map(facility => ({ ...facility, energyUnit: 'MMBtu' })) });
    expect(results.display()).toBeUndefined();
    state.set('ready'); expect(results.display()?.facility.energyUnit).toBe('MMBtu'); state.set('evaluating');
    store.publish({ ...original, facilities: original.facilities.map(facility => ({ ...facility, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6 })) });
    expect(results.display()).toBeUndefined();
    store.publish(original); state.set('ready'); expect(results.display()?.balance?.equipment).toBe(100);
    store.publish({ ...original, energyUseEquipment: [] }); expect(results.display()?.balance).toBeUndefined();
    store.publish(original); expect(results.display()?.balance?.equipment).toBe(100); state.set('evaluating');
    store.publish({ ...original, account: { ...original.account, guid: 'other-account' } });
    expect(results.display()).toBeUndefined();
  });
});

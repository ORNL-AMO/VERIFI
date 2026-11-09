import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../energy-uses.module';
import { FacilityEnergyUseResultsService } from '../results/facility-footprint/facility-energy-use-results.service';
import { BalanceFactsComponent } from './balance-facts.component';

it('shows loading/errors and renders unavailable source percentages without inventing zeroes', () => {
  const state = signal('evaluating'), retry = vi.fn();
  const balance = signal({ consumption: 100, equipment: 50, remaining: 50, label: 'Unaccounted', accountedPercent: 50 as number | null,
    complete: true, overAllocated: false, sources: [{ source: 'Electricity', consumption: 0, equipment: 0, remaining: 0, unaccounted: 0,
      label: 'Unaccounted', accountedPercent: null, coverage: '', equipmentPartial: false }] });
  const facility = { name: 'North plant', energyUnit: 'kWh' };
  const results = { facility: () => facility, year: () => 2025, result: () => ({ partial: false }),
    display: computed(() => state() === 'evaluating' ? undefined : ({ facility, year: 2025, balance: balance(), result: { partial: false } })),
    refreshing: computed(() => state() === 'evaluating'), calculationStatus: computed(() => ({ label: state() === 'evaluating' ? 'Calculating' : 'Updated', icon: 'info', tone: 'info' })),
    balanceView: balance, unavailableCalendar: () => false, context: { workspace: { ready: () => true, state: () => 'ready' } }, bills: { state, retry } };
  TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [{ provide: FacilityEnergyUseResultsService, useValue: results }] });
  const fixture = TestBed.createComponent(BalanceFactsComponent), root = fixture.nativeElement as HTMLElement; fixture.detectChanges();
  expect(root.textContent).toContain('Calculating'); expect(root.querySelector('dl')).toBeNull();
  state.set('ready'); fixture.detectChanges();
  expect(root.querySelector('dl')?.textContent).toMatch(/Accounted for\s*50%/);
  expect(root.querySelector('[aria-label="Electricity energy balance"]')?.textContent).toMatch(/Accounted for\s*Unavailable/);
  balance.set({ ...balance(), accountedPercent: null }); fixture.detectChanges();
  expect(root.querySelector('dl')?.textContent).toMatch(/Accounted for\s*Unavailable/);
  state.set('error'); fixture.detectChanges(); root.querySelector<HTMLButtonElement>('button')!.click(); expect(retry).toHaveBeenCalledOnce();
});

import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import type { IdbFacility } from '@data/models/idbModels/facility';
import { buildFacilityEnergyUseResult } from '../../../models/facility-energy-use-results.models';
import { energyUseChartYears, energyUseFiscalPeriod } from '../../../models/energy-use-projection.models';
import { buildFacilityEnergyUseBalance, facilityEnergyBalanceYear, FacilityEnergyUseBalance } from '../../../models/facility-energy-use-balance.models';
import { EnergyUseWorkbenchContextService } from '../../energy-use-workbench-context.service';
import { FacilityEnergyUseBalanceService } from './facility-energy-use-balance.service';

function balancePresentation(balance: FacilityEnergyUseBalance | undefined) {
  const remainder = (value: number | null) => ({ remaining: value === null ? null : Math.abs(value), label: value !== null && value < 0 ? 'Over allocated' : 'Unaccounted' });
  return balance ? { ...balance, ...remainder(balance.unaccounted), overAllocated: balance.sources.some(source => source.unaccounted !== null && source.unaccounted < 0),
    sources: balance.sources.map(source => ({ ...source, ...remainder(source.unaccounted) })) } : undefined;
}

interface FacilityDisplay {
  readonly key: string;
  readonly facility: Readonly<IdbFacility>;
  readonly year: number | undefined;
  readonly result: ReturnType<typeof buildFacilityEnergyUseResult>;
  readonly balance: ReturnType<typeof balancePresentation>;
}

/** One facility/year projection shared by the workbench facts and Facility Footprint. */
@Injectable()
export class FacilityEnergyUseResultsService {
  readonly context = inject(EnergyUseWorkbenchContextService);
  readonly bills = inject(FacilityEnergyUseBalanceService);
  readonly facility = computed(() => this.context.group()?.facility);
  readonly groups = computed(() => this.context.workspace.groups().filter(group => group.facility.guid === this.facility()?.guid));
  readonly items = computed(() => this.groups().flatMap(group => group.items));
  readonly year = computed(() => {
    const saved = energyUseChartYears(this.items().map(entry => entry.item)).at(-1), facility = this.facility();
    const billed = facility && this.bills.state() === 'ready' ? facilityEnergyBalanceYear(this.bills.meters(), facility, this.bills.readings()) : undefined;
    return saved === undefined ? billed : billed === undefined ? saved : Math.max(saved, billed);
  });
  readonly unavailableCalendar = computed(() => {
    const facility = this.facility(), year = this.year();
    return !!facility && year !== undefined && !energyUseFiscalPeriod(facility, year);
  });
  readonly result = computed(() => {
    const facility = this.facility();
    return facility && this.context.workspace.ready() ? buildFacilityEnergyUseResult(this.groups(), facility, this.year()) : undefined;
  });
  readonly balance = computed(() => {
    const facility = this.facility(), year = this.year();
    return facility && year !== undefined && !this.unavailableCalendar() && this.bills.state() === 'ready'
      ? buildFacilityEnergyUseBalance(facility, year, this.bills.meters(), this.bills.readings(), this.result()) : undefined;
  });
  readonly balanceView = computed(() => balancePresentation(this.balance()));
  readonly refreshing = computed(() => this.context.workspace.state() !== 'error'
    && (!this.context.workspace.ready() || this.bills.state() === 'idle' || this.bills.state() === 'evaluating'));
  /** Presentation only: retain one coherent result while the same facility refreshes. */
  readonly display = linkedSignal({
    source: () => {
      const facility = this.facility();
      return { facility, key: JSON.stringify([this.context.workspace.account()?.guid, facility?.guid, facility?.energyUnit,
        facility?.fiscalYear, facility?.fiscalYearMonth, facility?.fiscalYearCalendarEnd]),
        ready: this.context.workspace.ready(), refreshing: this.refreshing(), year: this.year(), result: this.result(), balance: this.balanceView() };
    },
    computation: (current, previous): FacilityDisplay | undefined => {
      if (!current.facility) return undefined;
      if (current.ready && !current.refreshing) return { ...current, facility: current.facility };
      return current.refreshing && previous?.value?.key === current.key ? previous.value : undefined;
    }
  });
  readonly calculationStatus = computed(() => {
    if (this.refreshing()) return { label: 'Calculating', icon: 'loading' as const, tone: 'info' as const };
    if (this.context.workspace.state() === 'error' || this.bills.state() === 'error') return { label: 'Unavailable', icon: 'warning' as const, tone: 'warning' as const };
    return this.display()?.balance ? { label: 'Updated', icon: 'check' as const, tone: 'success' as const }
      : { label: 'Unavailable', icon: 'info' as const, tone: 'info' as const };
  });
}

import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl } from '@angular/forms';
import { energyUseChartYears, energyUseFiscalPeriod } from '../../models/energy-use-projection.models';
import { buildEnergyUseResults } from '../../models/energy-use-results.models';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { EnergyUseResultsSessionService, EnergyUseResultsView } from './energy-use-results-session.service';

@Injectable()
export class EnergyUseResultsService {
  readonly context = inject(EnergyUseWorkbenchContextService);
  private readonly sessions = inject(EnergyUseResultsSessionService);
  private readonly view = signal<EnergyUseResultsView>({ history: false });
  readonly historyControl = new FormControl(false, { nonNullable: true });
  readonly years = computed(() => energyUseChartYears(this.context.items().map(entry => entry.item)));
  readonly history = computed(() => this.view().history);
  readonly unit = computed(() => this.context.group()?.facility.energyUnit ?? '');
  readonly annual = computed(() => {
    const group = this.context.group();
    return group && this.context.workspace.ready() ? buildEnergyUseResults(this.context.items().map(entry => entry.item), group.facility) : [];
  });
  readonly latest = computed(() => this.annual().at(-1));
  readonly unavailableCalendar = computed(() => {
    const group = this.context.group(), year = this.years().at(-1);
    return !!group && year !== undefined && !energyUseFiscalPeriod(group.facility, year);
  });

  constructor() {
    let previousKey = '';
    effect(() => {
      const key = this.context.key();
      untracked(() => {
        const saved = previousKey === key ? this.view() : this.sessions.read(key);
        previousKey = key;
        const next: EnergyUseResultsView = { history: saved?.history ?? false };
        this.view.set(next);
        this.historyControl.setValue(next.history, { emitEvent: false });
      });
    });
    const subscriptions = [
      this.historyControl.valueChanges.subscribe(history => this.update({ history }))
    ];
    inject(DestroyRef).onDestroy(() => subscriptions.forEach(subscription => subscription.unsubscribe()));
  }

  private update(patch: Partial<EnergyUseResultsView>): void {
    const next = { ...this.view(), ...patch };
    this.view.set(next);
    this.sessions.save(this.context.key(), next);
  }
}

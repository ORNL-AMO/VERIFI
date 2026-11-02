import { DestroyRef, Injector, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { DEFAULT_INVENTORY_CHART_VIEW } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.models';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import {
  buildInventoryMeterCharts, MeterChartGrouping
} from '@app/v1/data/meters/inventory/charts/meter-inventory-charts';
import {
  buildPredictorInventoryCharts, combinePredictorCharts
} from '@app/v1/data/predictors/inventory/charts/predictor-inventory-charts';
import { InventoryChartSessionService } from './inventory-chart-session.service';
import { InventoryToolsSource, inventoryToolsContextKey } from '../inventory-tools.models';

/** Chart demand and session state share the routed inventory lifetime without owning DOM or navigation. */
export class InventoryChartController {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly injector = inject(Injector);
  private readonly session = inject(InventoryChartSessionService);
  private readonly openValue = signal(false);
  readonly open = this.openValue.asReadonly();
  readonly grouping = signal<MeterChartGrouping>('groups');
  readonly multiplePredictors = signal(false);
  readonly view = signal({ ...DEFAULT_INVENTORY_CHART_VIEW });
  readonly zoom = signal({ start: 0, end: 100 });
  readonly form = new FormGroup({
    grouping: new FormControl<MeterChartGrouping>('groups', { nonNullable: true }),
    multiplePredictors: new FormControl(false, { nonNullable: true })
  });
  readonly contextKey = computed(() => inventoryToolsContextKey(this.source.context()));
  readonly resource = computed(() => this.source.context().resource);
  readonly facility = computed(() => this.workspace.facilities().find(facility =>
    facility.guid === this.source.context().facilityGuid));
  private readonly settings = computed(() => this.facility() ?? this.workspace.account());
  readonly contextLabel = computed(() => this.facility()?.name || 'All facilities');
  private readonly base = toSignal(
    toObservable(computed(() => this.open() && this.resource() === 'meters')).pipe(
      switchMap(active => active
        ? this.injector.get(WorkspaceCalendarizationService).calendarizeBase()
        : of(IDLE_WORKSPACE_CALENDARIZATION))
    ),
    { initialValue: IDLE_WORKSPACE_CALENDARIZATION }
  );
  private readonly projection = computed(() => {
    const base = this.base();
    const account = this.workspace.account();
    const settings = this.settings();
    const facility = this.facility();
    if (base.state !== 'ready' || !account || !settings || this.resource() !== 'meters') {
      return undefined;
    }
    return this.injector.get(WorkspaceCalendarizationService).project(base, {
      context: facility ? { kind: 'facility', guid: facility.guid } : { kind: 'account', guid: account.guid },
      meterGuids: this.source.matchingGuids(),
      energyUnit: settings.energyUnit,
      waterUnit: settings.volumeLiquidUnit,
      energyIsSource: settings.energyIsSource,
      includeEmissions: false
    });
  });
  readonly state = computed(() => {
    if (this.workspace.status() === 'error') {
      return 'error';
    }
    if (!this.workspace.canWrite()) {
      return 'loading';
    }
    if (this.resource() === 'predictors') {
      return 'ready';
    }
    if (this.projection()?.state === 'error' || this.base().state === 'error') {
      return 'error';
    }
    return this.base().state === 'ready' ? 'ready' : 'loading';
  });
  readonly predictorCharts = computed(() => !this.open() || this.resource() !== 'predictors'
    ? []
    : buildPredictorInventoryCharts(
      this.workspace.facilities(),
      this.workspace.predictors(),
      this.workspace.predictorData(),
      this.source.matchingGuids()
    ));
  readonly charts = computed(() => {
    if (!this.open()) {
      return [];
    }
    if (this.resource() === 'meters') {
      return buildInventoryMeterCharts(
        this.projection()?.meters ?? [],
        this.workspace.facilities(),
        this.workspace.meterGroups(),
        this.grouping(),
        this.settings()?.energyUnit ?? '',
        this.settings()?.volumeLiquidUnit ?? ''
      );
    }
    return this.multiplePredictors() ? combinePredictorCharts(this.predictorCharts()) : this.predictorCharts();
  });

  constructor(readonly source: InventoryToolsSource) {
    let previous = '';
    const save = () => {
      if (previous) {
        this.session.save(previous, {
          grouping: this.grouping(),
          multiplePredictors: this.multiplePredictors(),
          view: this.view(),
          zoom: this.zoom()
        });
      }
    };
    effect(() => {
      const key = this.contextKey();
      untracked(() => {
        if (key === previous) {
          return;
        }
        save();
        previous = key;
        const saved = this.session.read(key);
        this.grouping.set(saved?.grouping ?? 'groups');
        this.multiplePredictors.set(saved?.multiplePredictors ?? false);
        this.view.set(saved?.view ?? { ...DEFAULT_INVENTORY_CHART_VIEW });
        this.zoom.set(saved?.zoom ?? { start: 0, end: 100 });
        this.form.patchValue({
          grouping: this.grouping(),
          multiplePredictors: this.multiplePredictors()
        }, { emitEvent: false });
      });
    });
    const subscription = this.form.valueChanges.subscribe(() => {
      const value = this.form.getRawValue();
      if (value.grouping !== this.grouping()) {
        this.view.set({ ...this.view(), hiddenGuids: [] });
      }
      if (value.multiplePredictors !== this.multiplePredictors()) {
        this.zoom.set({ start: 0, end: 100 });
      }
      this.grouping.set(value.grouping);
      this.multiplePredictors.set(value.multiplePredictors);
    });
    inject(DestroyRef).onDestroy(() => {
      save();
      subscription.unsubscribe();
    });
  }

  show(): void {
    this.openValue.set(true);
  }

  close(): void {
    this.openValue.set(false);
  }
}

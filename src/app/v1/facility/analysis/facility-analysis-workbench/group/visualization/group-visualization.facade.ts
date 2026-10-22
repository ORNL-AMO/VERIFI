import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { buildInventoryChartStyles } from '@app/v1/shared/charts/inventory-chart-styles';
import { predictorDataQualityUnit } from '@domain/calculations/data-quality/predictor-data-quality';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { GroupVisualizationSession } from './group-visualization-session.service';
import { baselineStartMonth, buildGroupMonthlyPoints, defaultVisualizationRange, filterVisualizationPoints,
  summarizeCorrelation } from './group-visualization-data';
import type { GroupVisualizationPreferences, VisualizationPredictor } from './group-visualization.models';

@Injectable()
export class GroupVisualizationFacade {
  private readonly context = inject(FacilityAnalysisGroupContext);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly session = inject(GroupVisualizationSession);
  private readonly base = toSignal(this.calendarization.calendarizeBase(), { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  private readonly workbench = this.context.workbench;
  private readonly analysis = this.context.autosave.draft;
  private readonly key = computed(() => JSON.stringify([
    this.workbench.account()?.guid, this.workbench.facility()?.guid,
    this.workbench.analysisGuid(), this.context.groupGuid()
  ]));
  private readonly projection = computed(() => {
    const base = this.base(), analysis = this.analysis(), facility = this.workbench.facility();
    if (base.state !== 'ready' || !analysis || !facility) return undefined;
    return this.calendarization.project(base, {
      context: { kind: 'facility', guid: facility.guid }, meterGuids: this.context.meters().map(meter => meter.guid),
      energyUnit: analysis.energyUnit, waterUnit: analysis.waterUnit,
      energyIsSource: analysis.energyIsSource, includeEmissions: false
    });
  });
  readonly state = computed<'loading' | 'ready' | 'error'>(() => {
    if (this.base().state === 'error' || this.projection()?.state === 'error') return 'error';
    return this.projection()?.state === 'ready' ? 'ready' : 'loading';
  });
  readonly error = computed(() => this.projection()?.error?.message ?? this.base().error?.message);
  readonly groupName = computed(() => this.context.meterGroup()?.name ?? 'Group');
  readonly unit = computed(() => this.analysis()?.analysisCategory === 'water' ? this.analysis()?.waterUnit : this.analysis()?.energyUnit);
  readonly usageLabel = computed(() => `Group usage${this.unit() ? ` (${this.unit()})` : ''}`);
  readonly baselineStart = computed(() => baselineStartMonth(this.analysis()?.baselineYear, this.workbench.facility()));
  readonly predictors = computed<readonly VisualizationPredictor[]>(() => {
    const facility = this.workbench.facility(), account = this.workbench.account();
    const predictors = this.workbench.workspace.facilityPredictors()
      .filter(predictor => predictor.facilityId === facility?.guid && predictor.accountId === account?.guid)
      .slice().sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
    const styles = buildInventoryChartStyles(predictors.map(predictor => predictor.guid));
    return predictors.map(predictor => {
      const unit = predictorDataQualityUnit(predictor);
      const duplicateName = predictors.some(other => other.guid !== predictor.guid && other.name === predictor.name);
      return { guid: predictor.guid, name: predictor.name, unit,
        label: `${predictor.name}${unit ? ` (${unit})` : ''}${duplicateName ? ` · ${predictor.guid}` : ''}`,
        style: styles.get(predictor.guid)! };
    });
  });
  readonly points = computed(() => {
    const facilityGuid = this.workbench.facility()?.guid, accountGuid = this.workbench.account()?.guid;
    const readings = this.workbench.workspace.facilityPredictorData().filter(reading =>
      reading.facilityId === facilityGuid && reading.accountId === accountGuid);
    return buildGroupMonthlyPoints(this.projection()?.meters ?? [], readings,
      new Set(this.predictors().map(predictor => predictor.guid)), this.analysis()?.analysisCategory ?? 'energy',
      this.workbench.workspace.facilityMeterData());
  });
  readonly preferences = computed<GroupVisualizationPreferences>(() => {
    const saved = this.session.get(this.key());
    const available = new Set(this.predictors().map(predictor => predictor.guid));
    const selected = this.context.group()?.predictorVariables.filter(variable => variable.productionInAnalysis && available.has(variable.id)).map(variable => variable.id) ?? [];
    const firstWithData = this.predictors().find(predictor => this.points().some(point => point.predictors[predictor.guid] != null));
    const visiblePredictors = saved?.visiblePredictors ?? (selected.length ? selected : firstWithData ? [firstWithData.guid] : []);
    return { visiblePredictors: visiblePredictors.filter(guid => available.has(guid)),
      scale: saved?.scale ?? 'raw',
      zoom: saved?.zoom ?? { start: 0, end: 100 } };
  });
  readonly analysisRange = computed(() => defaultVisualizationRange(this.points(), this.baselineStart()));
  readonly filteredPoints = computed(() => filterVisualizationPoints(this.points(), this.analysisRange()));
  readonly visiblePredictors = computed(() => this.predictors().filter(predictor => this.preferences().visiblePredictors.includes(predictor.guid)));
  readonly partialMonths = computed(() => this.filteredPoints().filter(point => !point.complete).length);
  readonly duplicateMonths = computed(() => this.filteredPoints().filter(point => point.duplicatePredictors.some(guid => this.preferences().visiblePredictors.includes(guid))).length);
  readonly correlations = computed(() => this.visiblePredictors().map(predictor => ({ predictor,
    summary: summarizeCorrelation(this.filteredPoints(), predictor.guid) })));

  togglePredictor(guid: string): void {
    const visible = this.preferences().visiblePredictors;
    this.update({ visiblePredictors: visible.includes(guid) ? visible.filter(item => item !== guid) : [...visible, guid] });
  }

  isolatePredictor(guid: string): void {
    this.update({ visiblePredictors: [guid] });
  }

  update(patch: Partial<GroupVisualizationPreferences>): void {
    this.session.set(this.key(), { ...this.preferences(), ...patch });
  }

  retry(): void {
    this.calendarization.retry();
  }
}

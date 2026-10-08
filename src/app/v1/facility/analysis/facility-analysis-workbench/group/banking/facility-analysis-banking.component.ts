import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JStatRegressionModel } from '@data/models/analysis';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { FacilityAnalysisBankingResultsService } from './facility-analysis-banking-results.service';
import {
  MONTHLY_USE_COMPARISON_BAND,
  annualImprovementChartMetrics,
  annualImprovementChartRows,
  annualUseChartMetrics,
  annualUseChartRows,
  monthlySavingsChartView,
  monthlyUseChartMetrics,
  monthlyUseChartRows
} from '../../results/presentation/facility-analysis-result.view';
import { AnalysisResultNumberPipe } from '../../results/presentation/number/analysis-result-number.pipe';
import {
  bankedSavingsChartMonthlyRows,
  bankedSavingsPreviewRows
} from '../../banking/facility-analysis-banking';
import { AnalysisResultMarkersComponent } from '../../results/presentation/result-markers/analysis-result-markers/analysis-result-markers.component';
import { AnalysisResultMarkerLegendComponent } from '../../results/presentation/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import {
  AnalysisResultMarker,
  isAnnualModelPeriod,
  orderedUniqueResultMarkers
} from '../../results/presentation/result-markers/analysis-result-markers';
import { RegressionModelReviewSlideoutComponent } from '../regression/model-review-slideout/regression-model-review-slideout.component';
import { RegressionModelValidationState } from '../regression/regression-model-validation.service';
import { modeledQuantityLabel } from '../regression/regression-labels';
import { formatRegressionNumber } from '@app/v1/facility/analysis/regression-number-format';

@Component({
  selector: 'app-facility-analysis-banking',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    MeterResultsChartComponent,
    AnalysisResultNumberPipe,
    AnalysisResultMarkersComponent,
    AnalysisResultMarkerLegendComponent,
    RegressionModelReviewSlideoutComponent
  ],
  templateUrl: './facility-analysis-banking.component.html',
  styleUrls: ['./facility-analysis-banking.component.css']
})
export class FacilityAnalysisBankingComponent {
  readonly useComparisonBand = MONTHLY_USE_COMPARISON_BAND;
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisBankingResultsService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly source = this.results.sourceAnalysis;
  readonly sourceGroup = this.results.sourceGroup;
  readonly configuredGroup = this.groupContext.group;
  readonly facility = this.groupContext.workbench.facility;
  readonly sourceRoute = computed(() => {
    const facility = this.facility();
    const source = this.source();
    return facility && source
      ? this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, source.guid)
      : undefined;
  });
  readonly monthlyRows = computed(() => {
    const state = this.results.state();
    const group = this.configuredGroup();
    return state.state === 'ready' && group
      ? bankedSavingsChartMonthlyRows(state.monthly, group.bankedAnalysisYear, group.newBaselineYear)
      : [];
  });
  readonly annualViews = computed(() => {
    const state = this.results.state();
    const group = this.configuredGroup();
    const sourceGroup = this.sourceGroup();
    if (state.state !== 'ready' || !group || !sourceGroup) return [];
    return bankedSavingsPreviewRows(
      state.annual,
      group.bankedAnalysisYear,
      group.newBaselineYear
    ).map(view => ({
      ...view,
      markers: [
        view.transition ? 'transition' : 'banked-source',
        ...(isAnnualModelPeriod(sourceGroup, view.summary.year, this.facility()) ? ['model' as const] : [])
      ] as readonly AnalysisResultMarker[]
    }));
  });
  readonly legendMarkers = computed(() => orderedUniqueResultMarkers(this.annualViews().flatMap(view => view.markers)));
  readonly category = computed(() => this.source()?.analysisCategory);
  readonly unit = computed(() => this.category() === 'water' ? this.source()?.waterUnit : this.source()?.energyUnit);
  readonly annualUseRows = computed(() => annualUseChartRows(this.annualViews().map(view => ({
    ...view.summary,
    isIntermediateBanked: view.transition
  }))));
  readonly annualUseMetrics = computed(() => annualUseChartMetrics(this.category(), this.unit()));
  readonly annualImprovementRows = computed(() => annualImprovementChartRows(this.annualViews().map(view => ({
    ...view.summary,
    isIntermediateBanked: view.transition,
    totalSavingsPercentImprovement: view.totalSavingsPercentImprovement ?? 0,
    annualSavingsPercentImprovement: view.summary.annualSavingsPercentImprovement
  }))));
  readonly annualImprovementMetrics = computed(() => annualImprovementChartMetrics(this.category()));
  readonly monthlyUseRows = computed(() => monthlyUseChartRows(this.monthlyRows()));
  readonly monthlyUseMetrics = computed(() => monthlyUseChartMetrics(this.category(), this.unit()));
  readonly monthlySavings = computed(() => monthlySavingsChartView(this.monthlyRows(), this.monthlyRows().some(row => row.isBanked)));
  readonly selectedModel = computed(() => {
    const group = this.sourceGroup();
    return group?.models?.find(model => model.modelId === group.selectedModelId);
  });
  readonly modeledQuantityLabel = computed(() => modeledQuantityLabel(this.source()?.analysisCategory));
  readonly regressionEquation = computed(() => {
    const group = this.sourceGroup();
    if (!group || group.analysisType !== 'regression') return undefined;
    const model = this.selectedModel();
    if (model) {
      return [
        formatRegressionNumber(model.coef[0], '—'),
        ...model.predictorVariables.map((variable, index) => `(${formatRegressionNumber(model.coef[index + 1], '—')} × ${variable.name})`)
      ].join(' + ');
    }
    return [
      formatRegressionNumber(group.regressionConstant, '—'),
      ...group.predictorVariables
        .filter(variable => variable.productionInAnalysis)
        .map(variable => `(${formatRegressionNumber(variable.regressionCoefficient, '—')} × ${variable.name})`)
    ].join(' + ');
  });
  readonly inspectedModel = signal<JStatRegressionModel | undefined>(undefined);
  readonly reviewValidationState = computed<RegressionModelValidationState>(() => {
    const model = this.inspectedModel();
    if (!model) return { state: 'idle' };
    const state = this.results.state();
    return {
      state: 'ready',
      source: 'generated',
      model,
      monthly: state.state === 'ready' ? state.monthly : []
    };
  });
  private reviewTrigger: HTMLElement | undefined;

  inspectSelectedModel(trigger: HTMLElement): void {
    const model = this.selectedModel();
    if (!model) return;
    this.reviewTrigger = trigger;
    this.inspectedModel.set(model);
  }

  closeModelReview(): void {
    this.inspectedModel.set(undefined);
    const trigger = this.reviewTrigger;
    this.reviewTrigger = undefined;
    if (trigger) queueMicrotask(() => trigger.focus());
  }
}

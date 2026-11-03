import { Component, computed, input, output } from '@angular/core';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisChartsModule } from '@app/v1/shared/analysis-results/chart/analysis-charts.module';
import { AnalysisModelComparisonData } from '@app/v1/shared/analysis-results/model-comparison-chart/analysis-model-comparison-chart.view';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { RegressionModelValidationState } from '../regression-model-validation.service';
import { formatRegressionNumber } from '@app/v1/analysis/facility/regression-number-format';

@Component({
  selector: 'app-regression-model-validation',
  standalone: true,
  imports: [AnalysisChartsModule, IconComponent],
  templateUrl: './regression-model-validation.component.html',
  styleUrls: ['./regression-model-validation.component.css']
})
export class RegressionModelValidationComponent {
  readonly state = input.required<RegressionModelValidationState>();
  readonly analysis = input.required<IdbAnalysisItem>();
  readonly group = input.required<AnalysisGroup>();
  readonly retryRequested = output<void>();

  readonly validationRows = computed(() => {
    const state = this.state();
    return state.state === 'ready' ? (state.model.SEPValidation ?? []).map(row => ({
      ...row,
      meanReportYearDisplay: formatRegressionNumber(row.meanReportYear),
      meanBaselineYearDisplay: formatRegressionNumber(row.meanBaselineYear),
      modelMinDisplay: formatRegressionNumber(row.modelMin),
      modelMaxDisplay: formatRegressionNumber(row.modelMax),
      modelMinus3StdDevDisplay: formatRegressionNumber(row.modelMinus3StdDev),
      modelPlus3StdDevDisplay: formatRegressionNumber(row.modelPlus3StdDev)
    })) : [];
  });
  readonly passed = computed(() => {
    const state = this.state();
    return state.state === 'ready' && state.model.SEPValidationPass === true;
  });
  readonly comparisonData = computed<AnalysisModelComparisonData | undefined>(() => {
    const state = this.state();
    if (state.state !== 'ready') return undefined;
    const analysis = this.analysis();
    return { source: state.source, modelYear: state.model.modelYear, group: this.group(), category: analysis.analysisCategory,
      unit: analysis.analysisCategory === 'water' ? analysis.waterUnit : analysis.energyUnit, monthly: state.monthly, comparison: state.comparison };
  });
}

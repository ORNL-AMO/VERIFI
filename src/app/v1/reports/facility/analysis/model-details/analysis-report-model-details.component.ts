import { Component, computed, input } from '@angular/core';
import { MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { AnalysisDataCheckGroup } from '@domain/reports/analysis-data-checks';
import { analysisModelDetails } from '@app/v1/reports/shared/analysis-checks/analysis-model.view';
import { AnalysisModelComparisonData } from '@app/v1/shared/analysis-results/model-comparison-chart/analysis-model-comparison-chart.view';
@Component({ selector: 'app-analysis-report-model-details', standalone: false, templateUrl: './analysis-report-model-details.component.html', styleUrls: ['./analysis-report-model-details.component.css'] })
export class AnalysisReportModelDetailsComponent {
  readonly checked = input.required<AnalysisDataCheckGroup>();
  readonly monthly = input.required<readonly MonthlyAnalysisSummaryData[]>();
  readonly unit = input.required<string>();
  readonly category = input<'energy' | 'water'>('energy');
  readonly view = computed(() => analysisModelDetails(this.checked()));
  readonly comparisonData = computed<AnalysisModelComparisonData>(() => ({
    source: this.checked().model?.isUserDefinedModel ? 'user-defined' : 'generated',
    modelYear: this.checked().model?.modelYear ?? this.checked().group.regressionModelYear,
    group: this.checked().group, category: this.category(), unit: this.unit(),
    monthly: this.monthly().map(row => ({ ...row, energyUse: Number.isFinite(row.energyUse) ? row.energyUse : null,
      modeledEnergy: row.isIntermediateBanked || !Number.isFinite(row.modeledEnergy) ? null : row.modeledEnergy }))
  }));
}

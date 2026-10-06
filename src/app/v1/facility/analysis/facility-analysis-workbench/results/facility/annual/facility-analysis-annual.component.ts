import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { ANALYSIS_CHART_METRICS, annualChartRows } from '../../presentation/facility-analysis-result.view';
import { isSkippedAnalysisType } from '../../../facility-analysis-workbench.models';
import { AnalysisResultStatusComponent } from '../../presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../presentation/toolbar/analysis-result-toolbar.component';

@Component({ selector: 'app-facility-analysis-annual', standalone: true, imports: [CommonModule, MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultToolbarComponent], templateUrl: './facility-analysis-annual.component.html', styleUrls: ['./facility-analysis-annual.component.css'] })
export class FacilityAnalysisAnnualComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly chartRows = computed(() => annualChartRows(this.rows()));
  readonly chartMetrics = ANALYSIS_CHART_METRICS;
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water' ? this.context.analysis()?.waterUnit : this.context.analysis()?.energyUnit);
  readonly groupBreakdown = computed(() => {
    const state = this.results.state();
    if (state.state !== 'ready') return [];
    return state.groups.filter(item => !isSkippedAnalysisType(item.group.analysisType)).map(item => {
      const latest = item.annualAnalysisSummaryData[item.annualAnalysisSummaryData.length - 1];
      const name = this.context.meterGroups().find(group => group.guid === item.group.idbGroupId)?.name ?? item.group.idbGroupId;
      return { id: item.group.idbGroupId, name, year: latest?.year, actual: latest?.energyUse ?? 0, savings: latest?.savings ?? 0 };
    });
  });
}

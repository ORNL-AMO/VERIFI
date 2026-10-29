import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { AnalysisResultMarkerLegendComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import { AnalysisResultMarkersComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers/analysis-result-markers.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { FacilityAnalysisDashboardCard } from '../facility-analysis.models';
import { buildFacilityAnalysisComparisonView } from './facility-analysis-comparison.view';

@Component({
  selector: 'app-facility-analysis-comparison',
  standalone: true,
  imports: [
    CommonModule,
    MeterResultsChartComponent,
    AnalysisResultMarkerLegendComponent,
    AnalysisResultMarkersComponent,
    AnalysisResultNumberPipe
  ],
  templateUrl: './facility-analysis-comparison.component.html',
  styleUrls: ['./facility-analysis-comparison.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FacilityAnalysisComparisonComponent {
  readonly cards = input.required<readonly FacilityAnalysisDashboardCard[]>();
  readonly facility = input.required<IdbFacility>();
  readonly meterGroups = input.required<readonly IdbUtilityMeterGroup[]>();
  readonly analyses = input.required<readonly IdbAnalysisItem[]>();
  readonly showCategory = input(true);

  readonly comparison = computed(() => {
    const cards = this.cards();
    if (cards.length !== 2) return undefined;
    const view = buildFacilityAnalysisComparisonView(cards[0], cards[1], this.facility(), this.meterGroups(), this.analyses());
    return { ...view, analysisFields: this.showCategory() ? view.analysisFields : view.analysisFields.filter(field => field.id !== 'category') };
  });
}

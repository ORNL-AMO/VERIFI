import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { AnalysisResultMarkerLegendComponent } from '../../facility-analysis-workbench/results/presentation/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import { AnalysisResultMarkersComponent } from '../../facility-analysis-workbench/results/presentation/result-markers/analysis-result-markers/analysis-result-markers.component';
import { AnalysisResultNumberPipe } from '../../facility-analysis-workbench/results/presentation/number/analysis-result-number.pipe';
import { FacilityAnalysisDashboardCard } from '../facility-analysis.models';
import { buildFacilityAnalysisComparisonView } from './facility-analysis-comparison.view';

@Component({
  selector: 'app-analysis-comparison-slideout',
  standalone: true,
  imports: [
    CommonModule,
    WorkspaceSlideoutComponent,
    MeterResultsChartComponent,
    AnalysisResultMarkerLegendComponent,
    AnalysisResultMarkersComponent,
    AnalysisResultNumberPipe
  ],
  templateUrl: './analysis-comparison-slideout.component.html',
  styleUrls: ['./analysis-comparison-slideout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalysisComparisonSlideoutComponent {
  readonly cards = input.required<readonly FacilityAnalysisDashboardCard[]>();
  readonly facility = input.required<IdbFacility>();
  readonly meterGroups = input.required<readonly IdbUtilityMeterGroup[]>();
  readonly analyses = input.required<readonly IdbAnalysisItem[]>();
  readonly closed = output<void>();

  readonly comparison = computed(() => {
    const cards = this.cards();
    return cards.length === 2
      ? buildFacilityAnalysisComparisonView(cards[0], cards[1], this.facility(), this.meterGroups(), this.analyses())
      : undefined;
  });
}

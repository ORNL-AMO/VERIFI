import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { AnalysisGroup } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisBankingResultsService } from '../../banking/facility-analysis-banking-results.service';
import { bankedSavingsPreviewRows } from '../../../banking/facility-analysis-banking';
import { AnalysisResultNumberPipe } from '../../../results/presentation/number/analysis-result-number.pipe';
import { AnalysisResultMarkersComponent } from '../../../results/presentation/result-markers/analysis-result-markers/analysis-result-markers.component';
import { AnalysisResultMarkerLegendComponent } from '../../../results/presentation/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import { AnalysisResultMarker } from '../../../results/presentation/result-markers/analysis-result-markers';

@Component({
  selector: 'app-banked-group-savings',
  standalone: true,
  imports: [CommonModule, IconComponent, AnalysisResultNumberPipe, AnalysisResultMarkersComponent, AnalysisResultMarkerLegendComponent],
  templateUrl: './banked-group-savings.component.html',
  styleUrls: ['./banked-group-savings.component.css']
})
export class BankedGroupSavingsComponent {
  readonly group = input.required<AnalysisGroup>();
  readonly results = inject(FacilityAnalysisBankingResultsService);
  readonly rows = computed(() => {
    const state = this.results.state();
    const sourceGroup = this.results.sourceGroup();
    const group = this.group();
    return state.state === 'ready' && sourceGroup
      ? bankedSavingsPreviewRows(state.annual, group.bankedAnalysisYear, group.newBaselineYear, sourceGroup)
      : [];
  });
  readonly views = computed(() => this.rows().map(row => ({
    ...row,
    markers: [row.transition ? 'transition' : 'banked-source', ...(row.modelPeriod ? ['model' as const] : [])] as readonly AnalysisResultMarker[]
  })));
  readonly legendMarkers = computed(() => {
    const present = new Set(this.views().flatMap(row => row.markers));
    return (['banked-source', 'transition', 'model'] as const).filter(marker => present.has(marker));
  });
}

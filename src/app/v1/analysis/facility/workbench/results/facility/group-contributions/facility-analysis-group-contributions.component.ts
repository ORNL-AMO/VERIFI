import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ContributionHeatmapComponent } from '@app/v1/shared/analysis-results/contribution-heatmap/contribution-heatmap.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { facilityGroupContributionsView } from '../../presentation/facility-analysis-result.view';

@Component({
  selector: 'app-facility-analysis-group-contributions',
  standalone: true,
  imports: [
    CommonModule,
    ContributionHeatmapComponent,
    IconComponent,
    AnalysisResultNumberPipe,
    AnalysisResultStatusComponent
  ],
  templateUrl: './facility-analysis-group-contributions.component.html',
  styleUrls: ['./facility-analysis-group-contributions.component.css']
})
export class FacilityAnalysisGroupContributionsComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly view = computed(() => {
    const state = this.results.state();
    const groupNames = new Map(this.context.meterGroups().map(group => [group.guid, group.name]));
    return facilityGroupContributionsView(
      state.state === 'ready' ? state.annual : [],
      state.state === 'ready' ? state.groups : [],
      groupNames
    );
  });
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? this.context.analysis()?.waterUnit
    : this.context.analysis()?.energyUnit);
  readonly hasContributionData = computed(() => this.view().groups.length > 0 && this.view().years.length > 0);
  readonly heatmapView = computed(() => ({
    labels: this.view().groups.map(item => item.groupName),
    years: this.view().years.map(year => ({
      year: year.year,
      totalContributionPercent: year.totalContributionPercent,
      contributions: year.groups.map(item => item.contributionPercent)
    }))
  }));
}

import { Component, computed, inject } from '@angular/core';
import { GroupContributionsModule } from '@app/v1/shared/analysis-results/group-contributions/group-contributions.module';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { facilityGroupContributionsView } from '@app/v1/shared/analysis-results/group-contributions/group-contributions.view';

@Component({
  selector: 'app-facility-analysis-group-contributions',
  standalone: true,
  imports: [
    GroupContributionsModule,
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
}

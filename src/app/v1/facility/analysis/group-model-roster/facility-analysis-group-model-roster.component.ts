import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { buildFacilityAnalysisGroupModelViews } from './facility-analysis-group-model.view';

let nextRosterId = 0;

@Component({
  selector: 'app-facility-analysis-group-model-roster',
  standalone: true,
  templateUrl: './facility-analysis-group-model-roster.component.html',
  styleUrls: ['./facility-analysis-group-model-roster.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FacilityAnalysisGroupModelRosterComponent {
  readonly analysis = input.required<IdbAnalysisItem>();
  readonly meterGroups = input.required<readonly IdbUtilityMeterGroup[]>();
  readonly compact = input(false);
  readonly headingId = input(`v1-analysis-model-roster-title-${++nextRosterId}`);
  readonly groups = computed(() => buildFacilityAnalysisGroupModelViews(this.analysis(), this.meterGroups()));
}

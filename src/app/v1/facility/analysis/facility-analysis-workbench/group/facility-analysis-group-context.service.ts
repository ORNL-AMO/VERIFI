import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';

@Injectable()
export class FacilityAnalysisGroupContext {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly workbench = inject(FacilityAnalysisWorkbenchContext);
  readonly autosave = inject(FacilityAnalysisAutosaveService);
  readonly groupGuid = computed(() => this.params().get('groupGuid') ?? '');
  readonly group = computed(() => this.autosave.draft()?.groups.find(group => group.idbGroupId === this.groupGuid()));
  readonly meterGroup = computed(() => this.workbench.meterGroups().find(group => group.guid === this.groupGuid()));
  readonly meters = computed(() => this.workbench.workspace.facilityMeters().filter(meter => meter.groupId === this.groupGuid()));
  readonly findings = computed(() => {
    const analysisGuid = this.autosave.draft()?.guid;
    const entityGuid = analysisGuid ? `${analysisGuid}:${this.groupGuid()}` : '';
    return this.workbench.status.items().filter(item => item.entity.kind === 'analysis-group' && item.entity.guid === entityGuid);
  });
}

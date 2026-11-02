import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildAnalysisWorkbenchStages } from './facility-analysis-workbench.models';

@Injectable()
export class FacilityAnalysisWorkbenchContext {
  private readonly route = inject(ActivatedRoute);
  readonly workspace = inject(AccountWorkspaceStore);
  readonly status = inject(WorkspaceStatusService);
  private readonly routeParams = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly analyses = this.workspace.selectedFacilityAnalyses;
  readonly meterGroups = this.workspace.facilityMeterGroups;
  readonly analysisGuid = computed(() => this.routeParams().get('analysisGuid') ?? '');
  readonly analysis = computed(() => this.analyses().find(item => item.guid === this.analysisGuid()));
  readonly findings = computed(() => {
    const analysisGuid = this.analysisGuid();
    return this.status.items().filter(item =>
      (item.entity.kind === 'facility-analysis' && item.entity.guid === analysisGuid)
      || (item.entity.kind === 'analysis-group' && item.entity.guid.startsWith(`${analysisGuid}:`))
    );
  });
  readonly hasBlockingErrors = computed(() => this.findings().some(item => item.severity === 'error'));
  readonly stages = computed(() => {
    const facility = this.facility();
    const analysis = this.analysis();
    return facility && analysis ? buildAnalysisWorkbenchStages(facility.guid, analysis, this.meterGroups()) : [];
  });
}

import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import {
  buildAnalysisWorkbenchStageAttention,
  buildAnalysisWorkbenchStageNavigation,
  buildAnalysisWorkbenchStages,
} from '@app/v1/facility/analysis/facility-analysis-workbench/facility-analysis-workbench.models';
import {
  accountAnalysisWorkbenchReadiness,
  buildAccountAnalysisWorkbenchStageNavigation,
  buildAccountAnalysisWorkbenchStages
} from '@app/v1/account/analysis/account-analysis-workbench/account-analysis-workbench.models';
import { buildFacilitySelectionItems } from '@app/v1/account/analysis/account-analysis-workbench/select-facility-items/account-analysis-facility-selection.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';

import type { AnalysisNavigationStage } from '@app/v1/shared/analysis-stage-navigation/analysis-stage-navigation.component';
import { buildAnalysisNavGroups } from '../models';
interface AnalysisNavigation { readonly guid: string; readonly name: string; readonly steps: readonly AnalysisNavigationStage[]; }

@Component({
  selector: 'app-analysis-nav',
  templateUrl: './analysis-nav.component.html',
  styleUrls: ['./analysis-nav.component.css'],
  standalone: false
})
export class AnalysisNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(AccountWorkspaceStore);
  readonly status = inject(WorkspaceStatusService);
  readonly activeAnalysisNavigation = computed<AnalysisNavigation | undefined>(() => {
    const facility = this.navigation.facility();
    const analysisGuid = this.navigation.activeAnalysisGuid();
    if (!facility || !analysisGuid) return undefined;
    const analysis = this.workspace.selectedFacilityAnalyses().find(item => item.guid === analysisGuid);
    if (!analysis) return undefined;
    const stages = buildAnalysisWorkbenchStages(facility.guid, analysis, this.workspace.facilityMeterGroups());
    const scope = this.navigation.activeAnalysisStageScope();
    const groupGuid = this.navigation.activeAnalysisGroupGuid();
    const currentStageId = scope === 'group' && groupGuid ? `group:${groupGuid}` : scope ?? 'analysis';
    const findings = this.status.items().filter(item =>
      (item.entity.kind === 'facility-analysis' && item.entity.guid === analysisGuid)
      || (item.entity.kind === 'analysis-group' && item.entity.guid.startsWith(`${analysisGuid}:`))
    );
    const attention = buildAnalysisWorkbenchStageAttention(stages, analysisGuid, findings);
    return {
      guid: analysis.guid,
      name: analysis.name || 'Untitled analysis',
      steps: buildAnalysisWorkbenchStageNavigation(
        stages,
        currentStageId,
        analysisGuid,
        findings,
        false,
        this.status.state() === 'ready'
      ).map(stage => ({ ...stage, attention: this.status.state() === 'ready' ? attention[stage.id] : undefined }))
    };
  });
  readonly activeAccountAnalysisNavigation = computed<AnalysisNavigation | undefined>(() => {
    const account = this.navigation.account();
    const analysisGuid = this.navigation.activeAnalysisGuid();
    if (!account || !analysisGuid || this.navigation.contextMode() !== 'account') return undefined;
    const analysis = this.workspace.accountAnalyses().find(item => item.guid === analysisGuid);
    if (!analysis) return undefined;
    const findings = this.status.items().filter(item =>
      item.entity.kind === 'account-analysis' && item.entity.guid === analysisGuid
    );
    const selections = buildFacilitySelectionItems(
      analysis,
      this.workspace.facilities(),
      this.workspace.facilityAnalyses(),
      this.status.items(),
      this.status.state()
    );
    const readiness = accountAnalysisWorkbenchReadiness(
      analysis,
      findings,
      this.status.state() === 'ready',
      selections.length > 0
        && selections.length === this.workspace.facilities().length
        && selections.every(item => item.assigned && item.state !== 'error')
    );
    return {
      guid: analysis.guid,
      name: analysis.name || 'Untitled analysis',
      steps: buildAccountAnalysisWorkbenchStageNavigation(
        buildAccountAnalysisWorkbenchStages(account.guid, analysis.guid),
        this.navigation.activeAccountAnalysisStageScope() ?? 'setup',
        readiness,
        findings
      ).map(stage => ({ ...stage, attention: this.status.state() === 'ready' ? stage.attention : undefined }))
    };
  });

  readonly analysisGroups = computed(() => {
    const facility = this.navigation.facility();
    const account = this.navigation.account();
    const active = this.navigation.activeAnalysisGuid();
    if (this.navigation.contextMode() === 'facility') {
      return facility ? buildAnalysisNavGroups(this.workspace.selectedFacilityAnalyses(), facility, active,
        guid => this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, guid)) : [];
    }
    return account ? buildAnalysisNavGroups(this.workspace.accountAnalyses(), account, active,
      guid => this.navigation.accountAnalysisWorkbenchRoute(account.guid, guid)) : [];
  });
}

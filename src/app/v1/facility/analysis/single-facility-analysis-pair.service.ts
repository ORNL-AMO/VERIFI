import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import {
  AnalysisCommandHandler,
  FacilityAnalysisPairWriteResult,
  SingleFacilityAnalysisPairSyncResult
} from '@data/account-workspace/handlers/analysis-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspacePatch } from '@data/account-workspace/account-workspace.models';
import { singleFacilityAnalysisPairsNeedSync } from '@data/account-workspace/single-facility-analysis-pairs';

@Injectable({ providedIn: 'root' })
export class SingleFacilityAnalysisPairService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly handler = inject(AnalysisCommandHandler);
  private inFlight?: Promise<boolean>;

  ensurePairs(): Promise<boolean> {
    if (this.inFlight) return this.inFlight;
    const account = this.workspace.account();
    const facilities = this.workspace.facilities();
    if (account?.isSingleFacilityCompany !== true || facilities.length !== 1) {
      return Promise.resolve(false);
    }
    const facility = facilities[0];
    if (!singleFacilityAnalysisPairsNeedSync(
      account,
      facility,
      this.workspace.facilityAnalyses().filter(item => item.facilityId === facility.guid),
      this.workspace.accountAnalyses()
    )) return Promise.resolve(false);
    if (!this.workspace.canWrite() || this.workspace.hasPending()) return Promise.resolve(false);

    this.inFlight = this.boundary.execute({
      entityKind: 'accountAnalysis',
      changeKind: 'bulk',
      entityGuid: account.guid,
      label: 'Synchronizing single-facility analyses',
      notification: { suppressSuccessToast: true },
      publication: { mode: 'patch', buildPatch: singleFacilityPairPatch }
    }, () => this.handler.reconcileSingleFacilityAnalysisPairs(account.guid))
      .then(() => true)
      .finally(() => { this.inFlight = undefined; });
    return this.inFlight;
  }
}

export function singleFacilityPairPatch(result: SingleFacilityAnalysisPairSyncResult): WorkspacePatch {
  return {
    account: result.account,
    collections: result.accountAnalyses.length
      ? [{ collection: 'accountAnalyses', upsert: result.accountAnalyses }]
      : []
  };
}

export function facilityAnalysisPairWritePatch(result: FacilityAnalysisPairWriteResult): WorkspacePatch {
  const pairs = singleFacilityPairPatch(result);
  return {
    ...pairs,
    collections: [
      { collection: 'facilityAnalyses', upsert: [result.analysis] },
      ...(pairs.collections ?? [])
    ]
  };
}

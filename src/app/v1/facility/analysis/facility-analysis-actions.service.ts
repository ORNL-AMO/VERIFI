import { Injectable, inject } from '@angular/core';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { AnalysisCategory } from '@data/models/analysis';
import { IdbAccount } from '@data/models/idbModels/account';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getGUID } from '@shared/sharedHelperFunctions';

export interface ActiveAnalysisEligibility {
  readonly allowed: boolean;
  readonly reason?: string;
}

@Injectable({ providedIn: 'root' })
export class FacilityAnalysisActionsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly facilityHandler = inject(FacilityCommandHandler);

  categoryAvailable(category: AnalysisCategory): boolean {
    const groupType = category === 'energy' ? 'Energy' : 'Water';
    return this.workspace.facilityMeterGroups().some(group => group.groupType === groupType);
  }

  activeEligibility(analysis: IdbAnalysisItem): ActiveAnalysisEligibility {
    return getActiveAnalysisEligibility(this.requireAccount(false), this.requireFacility(false), analysis);
  }

  async createAnalysis(category: AnalysisCategory): Promise<IdbAnalysisItem> {
    const account = this.requireAccount();
    const facility = this.requireFacility();
    if (!this.categoryAvailable(category)) {
      throw new WorkspaceWriteError('validation-failed', `Create a ${category} meter group before creating this analysis.`);
    }
    const analysis = getNewIdbAnalysisItem(
      account,
      facility,
      [...this.workspace.meterGroups()],
      [...this.workspace.predictors()],
      category
    );
    const result = await this.boundary.execute({
      entityKind: 'facilityAnalysis', changeKind: 'add', entityGuid: analysis.guid, label: 'Adding facility analysis',
      notification: { successTitle: 'Analysis added', successMessage: analysis.name },
      publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('facilityAnalyses', [value]) }
    }, () => this.analysisHandler.addFacilityAnalysis(analysis, account.guid));
    return result.value;
  }

  async copyAnalysis(analysisGuid: string): Promise<IdbAnalysisItem> {
    const account = this.requireAccount();
    const current = this.requireAnalysis(analysisGuid);
    const now = new Date();
    const copy = structuredClone(current);
    delete copy.id;
    copy.guid = getGUID();
    copy.name = `${copy.name} (copy)`;
    copy.createdDate = now;
    copy.modifiedDate = now;
    const result = await this.boundary.execute({
      entityKind: 'facilityAnalysis', changeKind: 'add', entityGuid: copy.guid, label: 'Copying facility analysis',
      notification: { successTitle: 'Analysis copied', successMessage: copy.name },
      publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('facilityAnalyses', [value]) }
    }, () => this.analysisHandler.addFacilityAnalysis(copy, account.guid));
    return result.value;
  }

  async setActiveAnalysis(analysisGuid: string): Promise<IdbFacility> {
    const account = this.requireAccount();
    const facility = this.requireFacility();
    const analysis = this.requireAnalysis(analysisGuid);
    const eligibility = getActiveAnalysisEligibility(account, facility, analysis);
    if (!eligibility.allowed) throw new WorkspaceWriteError('validation-failed', eligibility.reason!);
    const updated = structuredClone(facility);
    if (analysis.analysisCategory === 'water') updated.selectedWaterAnalysisId = analysis.guid;
    else updated.selectedEnergyAnalysisId = analysis.guid;
    const result = await this.boundary.execute({
      entityKind: 'facility', changeKind: 'update', entityGuid: facility.guid, label: 'Setting active analysis',
      notification: { successTitle: 'Active analysis updated', successMessage: analysis.name },
      publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('facilities', [value]) }
    }, () => this.facilityHandler.update(updated, account.guid));
    return result.value;
  }

  private requireAccount(requireWritable = true): IdbAccount {
    const account = this.workspace.account();
    if (!account || (requireWritable && (!this.workspace.canWrite() || this.workspace.hasPending()))) {
      throw new WorkspaceWriteError('workspace-not-ready', 'The workspace is not ready for analysis changes.');
    }
    return account;
  }

  private requireFacility(requireWritable = true): IdbFacility {
    const facility = this.workspace.selectedFacility();
    if (!facility || (requireWritable && (!this.workspace.canWrite() || this.workspace.hasPending()))) {
      throw new WorkspaceWriteError('workspace-not-ready', 'A writable facility is required for analysis changes.');
    }
    return facility;
  }

  private requireAnalysis(guid: string): IdbAnalysisItem {
    const analysis = this.workspace.selectedFacilityAnalyses().find(item => item.guid === guid);
    if (!analysis) throw new WorkspaceWriteError('validation-failed', 'The analysis is not part of the selected facility.');
    return analysis;
  }
}

export function getActiveAnalysisEligibility(
  account: IdbAccount,
  facility: IdbFacility,
  analysis: IdbAnalysisItem
): ActiveAnalysisEligibility {
  const requiredBaseline = analysis.analysisCategory === 'water'
    ? account.sustainabilityQuestions.waterReductionBaselineYear
    : account.sustainabilityQuestions.energyReductionBaselineYear;
  if (analysis.baselineYear === requiredBaseline) return { allowed: true };
  if (facility.isNewFacility && analysis.baselineYear > requiredBaseline) return { allowed: true };
  return {
    allowed: false,
    reason: `The ${analysis.analysisCategory} analysis baseline (${analysis.baselineYear || 'not set'}) must match the account baseline (${requiredBaseline || 'not set'}) before it can be active for reporting.`
  };
}

import { inject, Injectable } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { AnalysisCategory } from '@data/models/analysis';
import { IdbAccount } from '@data/models/idbModels/account';
import { getNewIdbAccountAnalysisItem, IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { getGUID } from '@shared/sharedHelperFunctions';

export interface ActiveAccountAnalysisEligibility {
  readonly allowed: boolean;
  readonly reason?: string;
}

@Injectable({ providedIn: 'root' })
export class AccountAnalysisActionsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly accountHandler = inject(AccountCommandHandler);

  categoryAvailable(category: AnalysisCategory): boolean {
    return this.workspace.facilityAnalyses().some(analysis => analysis.analysisCategory === category);
  }

  activeEligibility(analysis: IdbAccountAnalysisItem): ActiveAccountAnalysisEligibility {
    return getActiveAccountAnalysisEligibility(this.requireAccount(false), analysis);
  }

  async createAnalysis(category: AnalysisCategory): Promise<IdbAccountAnalysisItem> {
    const account = this.requireAccount();
    if (!this.categoryAvailable(category)) {
      throw new WorkspaceWriteError(
        'validation-failed',
        `Create at least one facility ${category} analysis before creating an account analysis.`
      );
    }
    const analysis = getNewIdbAccountAnalysisItem(category, account, [...this.workspace.facilities()]);
    const result = await this.boundary.execute({
      entityKind: 'accountAnalysis',
      changeKind: 'add',
      entityGuid: analysis.guid,
      label: 'Adding account analysis',
      notification: { successTitle: 'Account analysis added', successMessage: analysis.name },
      publication: {
        mode: 'patch',
        buildPatch: value => upsertWorkspaceRecords('accountAnalyses', [value])
      }
    }, () => this.analysisHandler.addAccountAnalysis(analysis, account.guid));
    return result.value;
  }

  async copyAnalysis(analysisGuid: string): Promise<IdbAccountAnalysisItem> {
    const account = this.requireAccount();
    const current = this.requireAnalysis(analysisGuid);
    const now = new Date();
    const copy = structuredClone(current);
    delete copy.id;
    delete copy.dataCheckReviews;
    copy.guid = getGUID();
    copy.name = `${copy.name} (copy)`;
    copy.createdDate = now;
    copy.modifiedDate = now;
    copy.checked = false;
    const result = await this.boundary.execute({
      entityKind: 'accountAnalysis',
      changeKind: 'add',
      entityGuid: copy.guid,
      label: 'Copying account analysis',
      notification: { successTitle: 'Account analysis copied', successMessage: copy.name },
      publication: {
        mode: 'patch',
        buildPatch: value => upsertWorkspaceRecords('accountAnalyses', [value])
      }
    }, () => this.analysisHandler.addAccountAnalysis(copy, account.guid));
    return result.value;
  }

  async setActiveAnalysis(analysisGuid: string): Promise<IdbAccount> {
    const account = this.requireAccount();
    const analysis = this.requireAnalysis(analysisGuid);
    const eligibility = getActiveAccountAnalysisEligibility(account, analysis);
    if (!eligibility.allowed) {
      throw new WorkspaceWriteError('validation-failed', eligibility.reason!);
    }
    const updated: IdbAccount = {
      ...structuredClone(account),
      selectedEnergyAnalysisId: analysis.analysisCategory === 'energy'
        ? analysis.guid : account.selectedEnergyAnalysisId,
      selectedWaterAnalysisId: analysis.analysisCategory === 'water'
        ? analysis.guid : account.selectedWaterAnalysisId,
      modifiedDate: new Date()
    };
    const result = await this.boundary.execute({
      entityKind: 'account',
      changeKind: 'update',
      entityGuid: account.guid,
      label: 'Setting active account analysis',
      notification: { successTitle: 'Active account analysis updated', successMessage: analysis.name },
      publication: { mode: 'patch', buildPatch: value => ({ account: value }) }
    }, () => this.accountHandler.update(updated, account.guid));
    return result.value;
  }

  async deleteAnalysis(analysisGuid: string): Promise<void> {
    const account = this.requireAccount();
    const analysis = this.requireAnalysis(analysisGuid);
    await this.boundary.execute({
      entityKind: 'accountAnalysis',
      changeKind: 'delete',
      entityGuid: analysis.guid,
      label: 'Deleting account analysis',
      notification: { successTitle: 'Account analysis deleted', successMessage: analysis.name },
      publication: { mode: 'reload' }
    }, () => this.analysisHandler.deleteAccountAnalysisAtomic({
      accountGuid: account.guid,
      analysisGuid: analysis.guid
    }));
  }

  private requireAccount(requireWritable = true): IdbAccount {
    const account = this.workspace.account();
    if (!account || (requireWritable && (!this.workspace.canWrite() || this.workspace.hasPending()))) {
      throw new WorkspaceWriteError('workspace-not-ready', 'The workspace is not ready for account-analysis changes.');
    }
    return account;
  }

  private requireAnalysis(guid: string): IdbAccountAnalysisItem {
    const analysis = this.workspace.accountAnalyses().find(item => item.guid === guid);
    if (!analysis) {
      throw new WorkspaceWriteError('validation-failed', 'The account analysis is not part of the selected account.');
    }
    return analysis;
  }
}

export function getActiveAccountAnalysisEligibility(
  account: IdbAccount,
  analysis: IdbAccountAnalysisItem
): ActiveAccountAnalysisEligibility {
  const requiredBaseline = analysis.analysisCategory === 'water'
    ? account.sustainabilityQuestions.waterReductionBaselineYear
    : account.sustainabilityQuestions.energyReductionBaselineYear;
  if (analysis.baselineYear === requiredBaseline) return { allowed: true };
  return {
    allowed: false,
    reason: `The ${analysis.analysisCategory} analysis baseline (${analysis.baselineYear || 'not set'}) must match the account baseline (${requiredBaseline || 'not set'}) before it can be active for reporting.`
  };
}

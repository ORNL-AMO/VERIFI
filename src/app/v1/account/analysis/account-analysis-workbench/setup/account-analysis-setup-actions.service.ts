import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { AnalysisType } from '@data/models/analysis';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';

export type BulkFacilityAnalysisType = Extract<AnalysisType, 'absoluteEnergyConsumption' | 'energyIntensity'>;

@Injectable()
export class AccountAnalysisSetupActionsService {
  private readonly context = inject(AccountAnalysisWorkbenchContext);
  private readonly autosave = inject(AccountAnalysisAutosaveService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly busyValue = signal(false);
  private readonly errorValue = signal<string | undefined>(undefined);

  readonly busy = this.busyValue.asReadonly();
  readonly error = this.errorValue.asReadonly();

  clearError(): void {
    this.errorValue.set(undefined);
  }

  async clearSelections(): Promise<boolean> {
    if (this.busyValue() || !await this.autosave.flush()) return false;
    const account = this.context.account();
    const analysis = this.autosave.draft();
    if (!account || !analysis) return false;
    const updated: IdbAccountAnalysisItem = {
      ...structuredClone(analysis),
      isAnalysisVisited: false,
      facilityItemsInitialized: false,
      modifiedDate: new Date(),
      facilityAnalysisItems: analysis.facilityAnalysisItems.map(item => ({
        ...item,
        analysisItemId: undefined
      }))
    };
    this.busyValue.set(true);
    this.errorValue.set(undefined);
    try {
      await this.commandBoundary.execute({
        entityKind: 'accountAnalysis',
        changeKind: 'update',
        entityGuid: analysis.guid,
        label: 'Clearing account analysis facility selections',
        notification: { successTitle: 'Facility selections cleared', successMessage: analysis.name },
        publication: {
          mode: 'patch',
          buildPatch: value => upsertWorkspaceRecords('accountAnalyses', [value])
        }
      }, () => this.analysisHandler.updateAccountAnalysis(updated, account.guid));
      return true;
    } catch (error) {
      this.errorValue.set(errorMessage(error, 'The facility selections could not be cleared.'));
      return false;
    } finally {
      this.busyValue.set(false);
    }
  }

  async createBulkFacilityAnalyses(analysisType: BulkFacilityAnalysisType): Promise<boolean> {
    if (this.busyValue() || !await this.autosave.flush()) return false;
    const account = this.context.account();
    const analysis = this.autosave.draft();
    const facilities = this.context.facilities();
    if (!account || !analysis) return false;
    if (!this.context.workspace.canWrite() || this.context.workspace.hasPending()) {
      this.errorValue.set('The workspace is not ready for account-analysis changes.');
      return false;
    }
    if (analysis.facilityAnalysisItems.some(item => item.analysisItemId !== undefined)) {
      this.errorValue.set('Clear the current facility selections before creating analyses in bulk.');
      return false;
    }

    const generated = facilities.map(facility => buildBulkFacilityAnalysis(
      account,
      facility,
      this.context.workspace.meterGroups(),
      this.context.workspace.predictors(),
      analysis,
      analysisType
    ));

    this.busyValue.set(true);
    this.errorValue.set(undefined);
    try {
      await this.commandBoundary.execute({
        entityKind: 'accountAnalysis',
        changeKind: 'bulk',
        entityGuid: analysis.guid,
        label: 'Creating facility analyses',
        notification: {
          successTitle: 'Facility analyses created',
          successMessage: `${generated.length} ${generated.length === 1 ? 'analysis' : 'analyses'} created`
        }
      }, () => this.analysisHandler.createBulkFacilityAnalysesForAccount({
        accountGuid: account.guid,
        accountAnalysisGuid: analysis.guid,
        analyses: generated
      }));
      await this.router.navigate(this.navigation.accountAnalysisWorkbenchRoute(
        account.guid,
        analysis.guid,
        'select-items'
      ));
      return true;
    } catch (error) {
      this.errorValue.set(errorMessage(error, 'The facility analyses could not be created.'));
      return false;
    } finally {
      this.busyValue.set(false);
    }
  }
}

export function buildBulkFacilityAnalysis(
  account: Parameters<typeof getNewIdbAnalysisItem>[0],
  facility: Parameters<typeof getNewIdbAnalysisItem>[1],
  meterGroups: ReadonlyArray<Parameters<typeof getNewIdbAnalysisItem>[2][number]>,
  predictors: ReadonlyArray<Parameters<typeof getNewIdbAnalysisItem>[3][number]>,
  accountAnalysis: IdbAccountAnalysisItem,
  analysisType: BulkFacilityAnalysisType
): IdbAnalysisItem {
  const analysis = getNewIdbAnalysisItem(
    account,
    facility,
    [...meterGroups],
    [...predictors],
    accountAnalysis.analysisCategory
  );
  analysis.energyIsSource = accountAnalysis.energyIsSource;
  const facilityBaselineYear = accountAnalysis.analysisCategory === 'water'
    ? facility.sustainabilityQuestions.waterReductionBaselineYear
    : facility.sustainabilityQuestions.energyReductionBaselineYear;
  analysis.baselineYear = facility.isNewFacility && facilityBaselineYear > accountAnalysis.baselineYear
    ? facilityBaselineYear
    : accountAnalysis.baselineYear;
  if (accountAnalysis.name.trim()) analysis.name = accountAnalysis.name;
  analysis.groups.forEach(group => { group.analysisType = analysisType; });
  return analysis;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof WorkspaceWriteError || error instanceof Error) return error.message;
  return fallback;
}

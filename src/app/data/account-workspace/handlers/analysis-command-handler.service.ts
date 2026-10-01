/**
 * Handler for facility-analysis, account-analysis, and predictor-analysis commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountAnalysisDbService } from '@data/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from '@data/indexedDB/analysis-db.service';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';

export interface DeleteFacilityAnalysisCommand {
  readonly accountGuid: string;
  readonly facilityGuid: string;
  readonly analysisGuid: string;
}

export interface DeleteFacilityAnalysisResult {
  readonly deletedAnalysis: IdbAnalysisItem;
  readonly clearedAccountAnalysisCount: number;
  readonly clearedActiveSelection: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnalysisCommandHandler {
  constructor(
    private readonly analysisDb: AnalysisDbService,
    private readonly accountAnalysisDb: AccountAnalysisDbService,
    private readonly accountWorkspaceStore: AccountWorkspaceStore,
    private readonly transactions: IndexedDbTransactionService
  ) { }

  // ---------------------------------------------------------------------------
  // Facility analysis
  // ---------------------------------------------------------------------------

  async addFacilityAnalysis(analysis: IdbAnalysisItem, activeAccountGuid: string): Promise<IdbAnalysisItem> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'facility analysis');
    return firstValueFrom(this.analysisDb.addWithObservable({ ...analysis }));
  }

  async updateFacilityAnalysis(analysis: IdbAnalysisItem, activeAccountGuid: string): Promise<IdbAnalysisItem> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'facility analysis');
    return firstValueFrom(this.analysisDb.updateWithObservable({ ...analysis }));
  }

  async deleteFacilityAnalysis(analysis: IdbAnalysisItem, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'facility analysis');
    await firstValueFrom(this.analysisDb.deleteWithObservable(analysis.id));
    return analysis.id;
  }

  async deleteFacilityAnalysisAtomic(command: DeleteFacilityAnalysisCommand): Promise<DeleteFacilityAnalysisResult> {
    return this.transactions.runTransaction(
      ['analysisItems', 'accountAnalysisItems', 'facilities', 'facilityReports'],
      'readwrite',
      async transaction => {
        const analyses = await transaction.getAllByIndex<IdbAnalysisItem>('analysisItems', 'accountId', command.accountGuid);
        const analysis = analyses.find(item => item.guid === command.analysisGuid);
        if (!analysis || analysis.facilityId !== command.facilityGuid || analysis.id === undefined) {
          throw new WorkspaceWriteError('validation-failed', 'The analysis is missing or does not belong to the selected facility.');
        }
        this.assertOwnership(analysis.accountId, command.accountGuid, 'facility analysis');

        const reports = await transaction.getAllByIndex<IdbFacilityReport>('facilityReports', 'accountId', command.accountGuid);
        const linkedReports = reports.filter(report => report.analysisItemId === analysis.guid);
        if (linkedReports.length) {
          throw new WorkspaceWriteError('validation-failed', `Remove this analysis from ${linkedReports.length} linked facility report(s) before deleting it.`);
        }
        const bankingConsumers = analyses.filter(item => item.guid !== analysis.guid && item.bankedAnalysisItemId === analysis.guid);
        if (bankingConsumers.length) {
          throw new WorkspaceWriteError('validation-failed', `Remove this analysis from ${bankingConsumers.length} banking workflow(s) before deleting it.`);
        }

        const facilities = await transaction.getAllByIndex<IdbFacility>('facilities', 'accountId', command.accountGuid);
        const facility = facilities.find(item => item.guid === command.facilityGuid);
        if (!facility || facility.id === undefined) {
          throw new WorkspaceWriteError('validation-failed', 'The selected facility could not be found.');
        }
        const accountAnalyses = await transaction.getAllByIndex<IdbAccountAnalysisItem>('accountAnalysisItems', 'accountId', command.accountGuid);
        const now = new Date();
        let clearedAccountAnalysisCount = 0;
        for (const item of accountAnalyses) {
          let changed = false;
          const links = (item.facilityAnalysisItems ?? []).map(link => {
            if (link.facilityId === facility.guid && link.analysisItemId === analysis.guid) {
              changed = true;
              return { ...link, analysisItemId: undefined };
            }
            return { ...link };
          });
          if (changed) {
            clearedAccountAnalysisCount += 1;
            await transaction.put('accountAnalysisItems', { ...item, facilityAnalysisItems: links, modifiedDate: now });
          }
        }

        const clearedActiveSelection = facility.selectedEnergyAnalysisId === analysis.guid
          || facility.selectedWaterAnalysisId === analysis.guid;
        if (clearedActiveSelection) {
          await transaction.put('facilities', {
            ...facility,
            selectedEnergyAnalysisId: facility.selectedEnergyAnalysisId === analysis.guid ? undefined : facility.selectedEnergyAnalysisId,
            selectedWaterAnalysisId: facility.selectedWaterAnalysisId === analysis.guid ? undefined : facility.selectedWaterAnalysisId,
            modifiedDate: now
          });
        }
        await transaction.deleteByKey('analysisItems', analysis.id);
        return { deletedAnalysis: analysis, clearedAccountAnalysisCount, clearedActiveSelection };
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Account analysis
  // ---------------------------------------------------------------------------

  async addAccountAnalysis(analysis: IdbAccountAnalysisItem, activeAccountGuid: string): Promise<IdbAccountAnalysisItem> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'account analysis');
    return firstValueFrom(this.accountAnalysisDb.addWithObservable({ ...analysis }));
  }

  async updateAccountAnalysis(analysis: IdbAccountAnalysisItem, activeAccountGuid: string): Promise<IdbAccountAnalysisItem> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'account analysis');
    return firstValueFrom(this.accountAnalysisDb.updateWithObservable({ ...analysis }));
  }

  async deleteAccountAnalysis(analysis: IdbAccountAnalysisItem, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'account analysis');
    await firstValueFrom(this.accountAnalysisDb.deleteWithObservable(analysis.id));
    return analysis.id;
  }

  // ---------------------------------------------------------------------------
  // Predictor-analysis compound operations
  // ---------------------------------------------------------------------------

  /**
   * Adds the given predictor as a variable to every facility-analysis group
   * that belongs to the same facility.
   */
  async addAnalysisPredictor(newPredictor: IdbPredictor): Promise<void> {
    const facilityAnalysisItems = this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === newPredictor.facilityId);
    for (const analysisItem of facilityAnalysisItems) {
      const newPredictorVar = {
        id: newPredictor.guid,
        name: newPredictor.name,
        production: newPredictor.production,
        productionInAnalysis: newPredictor.productionInAnalysis,
        regressionCoefficient: undefined,
        unit: newPredictor.unit
      };
      const updated = {
        ...analysisItem,
        groups: analysisItem.groups.map(group => ({
          ...group,
          predictorVariables: [...group.predictorVariables, newPredictorVar]
        }))
      };
      await firstValueFrom(this.analysisDb.updateWithObservable(updated));
    }
  }

  async addAnalysisPredictors(newPredictors: IdbPredictor[]): Promise<void> {
    if (!newPredictors || newPredictors.length === 0) {
      return;
    }

    const facilityId = newPredictors[0].facilityId;
    const facilityPredictors = newPredictors.filter(p => p.facilityId === facilityId);

    const facilityAnalysisItems = this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === facilityId);

    for (const updated of buildFacilityAnalysesWithPredictors(facilityAnalysisItems, facilityPredictors)) {

      await firstValueFrom(this.analysisDb.updateWithObservable(updated));
    }
  }

  async upsertAnalysisPredictors(predictors: readonly IdbPredictor[]): Promise<void> {
    const facilityAnalysisItems = this.buildUpsertedAnalysisPredictors(predictors);
    for (const analysisItem of facilityAnalysisItems) {
      await firstValueFrom(this.analysisDb.updateWithObservable(analysisItem));
    }
  }

  buildUpsertedAnalysisPredictors(predictors: readonly IdbPredictor[]): IdbAnalysisItem[] {
    const predictorsByFacility = new Map<string, readonly IdbPredictor[]>();
    for (const predictor of predictors) {
      const facilityPredictors = predictorsByFacility.get(predictor.facilityId) ?? [];
      predictorsByFacility.set(predictor.facilityId, [...facilityPredictors, predictor]);
    }

    const facilityAnalysisItems = this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => predictorsByFacility.has(item.facilityId));

    return facilityAnalysisItems.map(analysisItem => {
      const facilityPredictors = predictorsByFacility.get(analysisItem.facilityId) ?? [];
      const predictorByGuid = new Map(facilityPredictors.map(predictor => [predictor.guid, predictor]));
      return {
        ...analysisItem,
        groups: analysisItem.groups.map(group => {
          const existingById = new Set(group.predictorVariables.map(variable => variable.id));
          const updatedVariables = group.predictorVariables.map(variable => {
            const predictor = predictorByGuid.get(variable.id);
            return predictor
              ? { ...variable, name: predictor.name, production: predictor.production, unit: predictor.unit }
              : variable;
          });
          const variablesToAdd = facilityPredictors
            .filter(predictor => !existingById.has(predictor.guid))
            .map(predictor => ({
              id: predictor.guid,
              name: predictor.name,
              production: predictor.production,
              productionInAnalysis: predictor.productionInAnalysis,
              regressionCoefficient: undefined,
              unit: predictor.unit
            }));

          return {
            ...group,
            predictorVariables: [...updatedVariables, ...variablesToAdd],
            models: group.models?.map(model => ({
              ...model,
              predictorVariables: model.predictorVariables.map(variable => {
                const predictor = predictorByGuid.get(variable.id);
                return predictor
                  ? { ...variable, name: predictor.name, production: predictor.production, unit: predictor.unit }
                  : variable;
              })
            }))
          };
        })
      };
    });
  }

  /**
   * Propagates a predictor's renamed/updated fields to every analysis group
   * and regression model that references it.
   */
  async updateAnalysisPredictor(predictor: IdbPredictor): Promise<void> {
    const facilityAnalysisItems = this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === predictor.facilityId);
    for (const updated of buildFacilityAnalysisPredictorUpdates(facilityAnalysisItems, predictor)) {
      await firstValueFrom(this.analysisDb.updateWithObservable(updated));
    }
  }

  /**
   * Removes the deleted predictor from every facility-analysis group variable
   * list. Clears regression models that included the predictor in their
   * selected model; models that did not use it are pruned but selection kept.
   */
  async deleteAnalysisPredictor(predictorToDelete: IdbPredictor): Promise<void> {
    const facilityAnalysisItems = this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === predictorToDelete.facilityId);
    for (const analysisItem of facilityAnalysisItems) {
      const updated = {
        ...analysisItem,
        groups: analysisItem.groups.map(group => {
          const predictorVariables = group.predictorVariables.filter(
            pVar => pVar.id !== predictorToDelete.guid
          );
          if (group.analysisType !== 'regression' || !group.models) {
            return { ...group, predictorVariables };
          }
          const selectedModel = group.models.find(m => m.modelId === group.selectedModelId);
          if (!selectedModel) {
            return { ...group, predictorVariables };
          }
          const selectedUsesDeleted = selectedModel.predictorVariables.some(
            mv => mv.id === predictorToDelete.guid
          );
          if (selectedUsesDeleted) {
            return {
              ...group, predictorVariables,
              models: undefined, selectedModelId: undefined,
              regressionModelYear: undefined, regressionConstant: undefined,
              dateModelsGenerated: undefined
            };
          }
          return {
            ...group, predictorVariables,
            models: group.models.filter(m =>
              !m.predictorVariables.some(mv => mv.id === predictorToDelete.guid)
            )
          };
        })
      };
      await firstValueFrom(this.analysisDb.updateWithObservable(updated));
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertOwnership(entityAccountGuid: string | undefined, activeAccountGuid: string, label: string): void {
    if (entityAccountGuid && entityAccountGuid !== activeAccountGuid) {
      throw new WorkspaceWriteError(
        'cross-account-entity',
        `${label} belongs to account ${entityAccountGuid}, not the active account ${activeAccountGuid}.`
      );
    }
  }
}

export function buildFacilityAnalysesWithPredictors(
  analyses: readonly IdbAnalysisItem[],
  predictors: readonly IdbPredictor[]
): IdbAnalysisItem[] {
  return analyses.map(analysisItem => ({
    ...structuredClone(analysisItem),
    groups: analysisItem.groups.map(group => {
      const existingById = new Set(group.predictorVariables.map(variable => variable.id));
      const variables = predictors
        .filter(predictor => predictor.facilityId === analysisItem.facilityId && !existingById.has(predictor.guid))
        .map(predictor => ({
          id: predictor.guid,
          name: predictor.name,
          production: predictor.production,
          productionInAnalysis: predictor.productionInAnalysis,
          regressionCoefficient: undefined,
          unit: predictor.unit
        }));
      return { ...group, predictorVariables: [...group.predictorVariables, ...variables] };
    })
  }));
}

export function buildFacilityAnalysisPredictorUpdates(
  analyses: readonly IdbAnalysisItem[],
  predictor: IdbPredictor
): IdbAnalysisItem[] {
  return analyses.map(analysisItem => ({
    ...structuredClone(analysisItem),
    groups: analysisItem.groups.map(group => ({
      ...group,
      predictorVariables: group.predictorVariables.map(variable => variable.id === predictor.guid
        ? { ...variable, name: predictor.name, production: predictor.production, unit: predictor.unit }
        : variable),
      models: group.models?.map(model => ({
        ...model,
        predictorVariables: model.predictorVariables.map(variable => variable.id === predictor.guid
          ? { ...variable, name: predictor.name, production: predictor.production, unit: predictor.unit }
          : variable)
      }))
    }))
  }));
}

export function buildFacilityAnalysesWithoutPredictors(
  analyses: readonly IdbAnalysisItem[],
  predictorGuids: ReadonlySet<string>
): IdbAnalysisItem[] {
  if (predictorGuids.size === 0) return analyses.map(analysis => structuredClone(analysis));
  return analyses.map(analysisItem => ({
    ...structuredClone(analysisItem),
    groups: analysisItem.groups.map(group => {
      const predictorVariables = group.predictorVariables.filter(variable => !predictorGuids.has(variable.id));
      if (group.analysisType !== 'regression' || !group.models) return { ...group, predictorVariables };
      const selectedModel = group.models.find(model => model.modelId === group.selectedModelId);
      const selectedUsesDeleted = selectedModel?.predictorVariables.some(variable => predictorGuids.has(variable.id));
      if (selectedUsesDeleted) {
        return {
          ...group,
          predictorVariables,
          models: undefined,
          selectedModelId: undefined,
          regressionModelYear: undefined,
          regressionConstant: undefined,
          dateModelsGenerated: undefined
        };
      }
      return {
        ...group,
        predictorVariables,
        models: group.models.filter(model =>
          !model.predictorVariables.some(variable => predictorGuids.has(variable.id)))
      };
    })
  }));
}

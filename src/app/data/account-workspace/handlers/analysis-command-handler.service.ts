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

@Injectable({ providedIn: 'root' })
export class AnalysisCommandHandler {
  constructor(
    private readonly analysisDb: AnalysisDbService,
    private readonly accountAnalysisDb: AccountAnalysisDbService,
    private readonly accountWorkspaceStore: AccountWorkspaceStore
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

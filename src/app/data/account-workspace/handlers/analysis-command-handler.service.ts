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
import { AnalysisGroup, AnalysisGroupPredictorVariable } from '@data/models/analysis';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { AccountWorkspaceStore } from '../account-workspace.store';

export type FacilityAnalysisFieldChanges = Partial<Omit<IdbAnalysisItem, 'id' | 'guid' | 'accountId' | 'facilityId' | 'groups'>>;
export type AccountAnalysisFieldChanges = Partial<Omit<IdbAccountAnalysisItem, 'id' | 'guid' | 'accountId' | 'facilityAnalysisItems'>>;
export type AnalysisPredictorChanges = Pick<AnalysisGroupPredictorVariable, 'id'>
  & Partial<Pick<AnalysisGroupPredictorVariable, 'productionInAnalysis' | 'regressionCoefficient'>>;
export type AnalysisGroupChanges = Partial<Omit<AnalysisGroup, 'idbGroupId' | 'predictorVariables'>> & {
  predictorVariables?: readonly AnalysisPredictorChanges[];
};
export type AccountFacilityAssignment = IdbAccountAnalysisItem['facilityAnalysisItems'][number];

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

  /** Resolve inside the command callback so queued edits merge with earlier commits. */
  async updateFacilityAnalysisFields(
    analysisGuid: string,
    changes: FacilityAnalysisFieldChanges,
    activeAccountGuid: string
  ): Promise<IdbAnalysisItem> {
    const current = this.requireFacilityAnalysis(analysisGuid, activeAccountGuid);
    return this.updateFacilityAnalysis({ ...current, ...structuredClone(changes) }, activeAccountGuid);
  }

  async updateFacilityAnalysisGroup(
    analysisGuid: string,
    groupGuid: string,
    changes: AnalysisGroupChanges,
    activeAccountGuid: string
  ): Promise<IdbAnalysisItem> {
    const current = this.requireFacilityAnalysis(analysisGuid, activeAccountGuid);
    const group = current.groups.find(item => item.idbGroupId === groupGuid);
    if (!group) throw new WorkspaceWriteError('validation-failed', 'The analysis group no longer exists.');
    const { predictorVariables, ...fields } = structuredClone(changes);
    const predictorChanges = new Map(predictorVariables?.map(variable => [variable.id, variable]));
    if (predictorVariables?.some(variable => !group.predictorVariables.some(currentVariable => currentVariable.id === variable.id))) {
      throw new WorkspaceWriteError('validation-failed', 'An edited analysis predictor no longer exists.');
    }
    const updatedGroup: AnalysisGroup = {
      ...group,
      ...fields,
      predictorVariables: group.predictorVariables.map(variable => {
        const changed = predictorChanges.get(variable.id);
        return changed ? { ...variable, ...changed } : variable;
      })
    };
    return this.updateFacilityAnalysis({
      ...current,
      isAnalysisVisited: false,
      groups: current.groups.map(item => item.idbGroupId === groupGuid ? updatedGroup : item)
    }, activeAccountGuid);
  }

  async clearFacilityAnalysisModels(analysisGuid: string, activeAccountGuid: string): Promise<IdbAnalysisItem> {
    const current = this.requireFacilityAnalysis(analysisGuid, activeAccountGuid);
    return this.updateFacilityAnalysis({
      ...current,
      isAnalysisVisited: false,
      groups: current.groups.map(group => ({
        ...group,
        models: [],
        selectedModelId: undefined,
        regressionConstant: undefined,
        regressionModelYear: undefined,
        predictorVariables: group.predictorVariables.map(variable => ({ ...variable, regressionCoefficient: undefined }))
      }))
    }, activeAccountGuid);
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

  async updateAccountAnalysisFields(
    analysisGuid: string,
    changes: AccountAnalysisFieldChanges,
    activeAccountGuid: string
  ): Promise<IdbAccountAnalysisItem> {
    const current = this.requireAccountAnalysis(analysisGuid, activeAccountGuid);
    return this.updateAccountAnalysis({ ...current, ...structuredClone(changes) }, activeAccountGuid);
  }

  async updateAccountFacilityAssignments(
    analysisGuid: string,
    assignments: readonly AccountFacilityAssignment[],
    activeAccountGuid: string,
    changes: AccountAnalysisFieldChanges = {}
  ): Promise<IdbAccountAnalysisItem> {
    const current = this.requireAccountAnalysis(analysisGuid, activeAccountGuid);
    const facilities = this.accountWorkspaceStore.facilities();
    for (const assignment of assignments) {
      if (!facilities.some(item => item.guid === assignment.facilityId && item.accountId === activeAccountGuid)) {
        throw new WorkspaceWriteError('validation-failed', 'An assigned facility no longer exists in this account.');
      }
      if (assignment.analysisItemId && assignment.analysisItemId !== 'skip') {
        // A compound command may have created this analysis before workspace publication.
        const selected = this.accountWorkspaceStore.facilityAnalyses().find(item => item.guid === assignment.analysisItemId)
          ?? await this.analysisDb.getStoredByGuid(assignment.analysisItemId);
        if (!selected || selected.accountId !== activeAccountGuid || selected.facilityId !== assignment.facilityId) {
          throw new WorkspaceWriteError('validation-failed', 'The assigned analysis no longer belongs to this facility.');
        }
      }
    }
    const assignmentByFacility = new Map(assignments.map(item => [item.facilityId, structuredClone(item)]));
    const updatedAssignments = current.facilityAnalysisItems.map(item => assignmentByFacility.get(item.facilityId) ?? item);
    for (const assignment of assignmentByFacility.values()) {
      if (!updatedAssignments.some(item => item.facilityId === assignment.facilityId)) updatedAssignments.push(assignment);
    }
    return this.updateAccountAnalysis({
      ...current,
      isAnalysisVisited: false,
      ...structuredClone(changes),
      facilityAnalysisItems: updatedAssignments
    }, activeAccountGuid);
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

    for (const analysisItem of facilityAnalysisItems) {
      const updated = {
        ...analysisItem,
        groups: analysisItem.groups.map(group => {
          const existingById = new Set(group.predictorVariables.map(v => v.id));
          const varsToAdd = facilityPredictors
            .filter(p => !existingById.has(p.guid))
            .map(p => ({
              id: p.guid,
              name: p.name,
              production: p.production,
              productionInAnalysis: p.productionInAnalysis,
              regressionCoefficient: undefined,
              unit: p.unit
            }));

          return {
            ...group,
            predictorVariables: [...group.predictorVariables, ...varsToAdd]
          };
        })
      };

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
    for (const analysisItem of facilityAnalysisItems) {
      const updated = {
        ...analysisItem,
        groups: analysisItem.groups.map(group => ({
          ...group,
          predictorVariables: group.predictorVariables.map(pVar =>
            pVar.id === predictor.guid
              ? { ...pVar, name: predictor.name, production: predictor.production, unit: predictor.unit }
              : pVar
          ),
          models: group.models?.map(model => ({
            ...model,
            predictorVariables: model.predictorVariables.map(pVar =>
              pVar.id === predictor.guid
                ? { ...pVar, name: predictor.name, production: predictor.production, unit: predictor.unit }
                : pVar
            )
          }))
        }))
      };
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

  private requireFacilityAnalysis(analysisGuid: string, activeAccountGuid: string): IdbAnalysisItem {
    const current = this.accountWorkspaceStore.facilityAnalyses().find(item => item.guid === analysisGuid);
    if (!current) throw new WorkspaceWriteError('validation-failed', 'The facility analysis no longer exists.');
    this.assertOwnership(current.accountId, activeAccountGuid, 'facility analysis');
    if (!this.accountWorkspaceStore.facilities().some(item => item.guid === current.facilityId && item.accountId === activeAccountGuid)) {
      throw new WorkspaceWriteError('validation-failed', 'The facility analysis owner no longer exists.');
    }
    return current;
  }

  private requireAccountAnalysis(analysisGuid: string, activeAccountGuid: string): IdbAccountAnalysisItem {
    const current = this.accountWorkspaceStore.accountAnalyses().find(item => item.guid === analysisGuid);
    if (!current) throw new WorkspaceWriteError('validation-failed', 'The account analysis no longer exists.');
    this.assertOwnership(current.accountId, activeAccountGuid, 'account analysis');
    return current;
  }

  private assertOwnership(entityAccountGuid: string | undefined, activeAccountGuid: string, label: string): void {
    if (entityAccountGuid && entityAccountGuid !== activeAccountGuid) {
      throw new WorkspaceWriteError(
        'cross-account-entity',
        `${label} belongs to account ${entityAccountGuid}, not the active account ${activeAccountGuid}.`
      );
    }
  }
}

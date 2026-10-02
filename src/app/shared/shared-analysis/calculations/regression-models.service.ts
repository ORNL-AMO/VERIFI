import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { Injectable, inject } from '@angular/core';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from '@data/models/analysis';
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { AssessmentReportVersion } from '@data/models/idbModels/account';
import { RegressionModelsCalculator } from '@shared/shared-analysis/calculations/regression-models-calculator';
import { convertOrphanedGeneratedModelToUserDefined, findEquivalentRegressionModel, getSelectedRegressionModel } from '@shared/shared-analysis/calculations/regression-model-recovery';
import { RegressionModelsWorkerRequest, RegressionModelsWorkerResponse } from '@platform/web-workers/regression-models-worker.contract';
import { buildUserDefinedRegressionModel, calculateRegressionModels } from './regression-models-calculation';
import { runWorker } from '@platform/web-workers/run-worker';
import { firstValueFrom, fromEvent, takeUntil } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegressionModelsService {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);

  generateModels(
    group: AnalysisGroup,
    analysisItem: IdbAnalysisItem,
    facility: IdbFacility,
    meters: Array<IdbUtilityMeter>,
    meterData: Array<IdbUtilityMeterData>,
    facilityPredictorData: Array<IdbPredictorData>,
    assessmentReportVersion: AssessmentReportVersion,
    signal?: AbortSignal
  ): Promise<Array<JStatRegressionModel>> {
    const request: RegressionModelsWorkerRequest = {
      group: structuredClone(group),
      analysisItem: structuredClone(analysisItem),
      facility,
      meters,
      meterData,
      facilityPredictorData,
      assessmentReportVersion
    };
    if (signal?.aborted) return Promise.reject(abortError());
    if (typeof Worker === 'undefined') return Promise.resolve().then(() => calculateRegressionModels(request));

    const worker = new Worker(new URL('../../../platform/web-workers/regression-models.worker', import.meta.url));
    const response$ = signal
      ? runWorker<RegressionModelsWorkerResponse>(worker, request).pipe(takeUntil(fromEvent(signal, 'abort')))
      : runWorker<RegressionModelsWorkerResponse>(worker, request);
    return firstValueFrom(response$).then(response => {
      if (response.ok === false) throw new Error(response.message);
      return [...response.generatedModels];
    }).catch(error => {
      if (signal?.aborted) throw abortError();
      throw error;
    });
  }

  applyGeneratedModelsToGroup(
    group: AnalysisGroup,
    generatedModels: Array<JStatRegressionModel>,
    previousSelectedModelId: string | undefined,
    previousSelectedModel: JStatRegressionModel | undefined,
    facility: IdbFacility,
    fallbackYear: number | undefined
  ): { updatedGroup: AnalysisGroup; newSelectedModel: JStatRegressionModel | undefined } {
    let updatedGroup: AnalysisGroup = { ...group, dateModelsGenerated: new Date() };
    const hadPreviousSelection = previousSelectedModelId != undefined;
    let selectedModel = generatedModels.find(model => model.modelId === previousSelectedModelId);

    if (!selectedModel && hadPreviousSelection) {
      selectedModel = findEquivalentRegressionModel(previousSelectedModel, generatedModels);
    }

    if (selectedModel) {
      updatedGroup = this.applySelectedModelToGroup(updatedGroup, selectedModel);
      return { updatedGroup, newSelectedModel: selectedModel };
    }

    if (hadPreviousSelection) {
      updatedGroup = convertOrphanedGeneratedModelToUserDefined(updatedGroup, facility, fallbackYear);
      return { updatedGroup, newSelectedModel: undefined };
    }

    return {
      updatedGroup: { ...updatedGroup, selectedModelId: undefined, models: undefined },
      newSelectedModel: undefined
    };
  }

  private applySelectedModelToGroup(group: AnalysisGroup, selectedModel: JStatRegressionModel): AnalysisGroup {
    return {
      ...group,
      selectedModelId: selectedModel.modelId,
      models: [selectedModel],
      regressionConstant: selectedModel.coef[0],
      regressionModelYear: selectedModel.modelYear,
      predictorVariables: group.predictorVariables.map(variable => {
        const coefIndex = selectedModel.predictorVariables.findIndex(pVariable => pVariable.id === variable.id);
        return {
          ...variable,
          regressionCoefficient: coefIndex !== -1 ? selectedModel.coef[coefIndex + 1] : 0
        };
      })
    };
  }

  getModels(analysisGroup: AnalysisGroup, calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility, analysisItem: IdbAnalysisItem): Array<JStatRegressionModel> {
    const facilityPredictorData = this.accountWorkspaceQuery.getFacilityPredictorData(facility.guid);
    return new RegressionModelsCalculator(facilityPredictorData).getModels(analysisGroup, calanderizedMeters, facility, analysisItem);
  }

  getUserDefinedModel(selectedGroup: AnalysisGroup, selectedFacility: IdbFacility, analysisItem: IdbAnalysisItem, reportYear: number): JStatRegressionModel {
    return buildUserDefinedRegressionModel(
      selectedGroup,
      selectedFacility,
      analysisItem,
      reportYear,
      this.accountWorkspaceQuery.getFacilityPredictorData(selectedFacility.guid)
    );
  }

  getGroupModelItem(group: AnalysisGroup, facility: IdbFacility, analysisItem: IdbAnalysisItem, reportYear: number): FacilityGroupAnalysisItem {
    let selectedModel: JStatRegressionModel;
    if (group.analysisType == 'regression') {
      if (group.selectedModelId) {
        selectedModel = getSelectedRegressionModel(group);
        if (selectedModel) {
          //set model validation for report year
          let facilityPredictorData: Array<IdbPredictorData> = this.accountWorkspaceQuery.getFacilityPredictorData(facility.guid);
          //check p-variable ids for model object, was not getting updated on import prior to v0.14.9
          //group p-variable ids will be correctly mapped to data use them to check model variable ids and update if needed
          let groupPredictorVariableIds: Array<string> = group.predictorVariables.map(variable => variable.id);
          selectedModel.predictorVariables.forEach(modelVariable => {
            if (!groupPredictorVariableIds.includes(modelVariable.id)) {
              let matchVariable: AnalysisGroupPredictorVariable = group.predictorVariables.find(v => v.name == modelVariable.name);
              if (matchVariable) {
                modelVariable.id = matchVariable.id;
              }
            }
          });

          selectedModel = new RegressionModelsCalculator(facilityPredictorData).setModelVaildAndNotes(selectedModel, reportYear, facility, analysisItem.baselineYear, group);
        } else if (group.isGeneratedModel) {
          group = convertOrphanedGeneratedModelToUserDefined(group, facility, analysisItem.baselineYear);
          selectedModel = this.getUserDefinedModel(group, facility, analysisItem, reportYear);
        }

      } else if (!group.isGeneratedModel) {
        selectedModel = this.getUserDefinedModel(group, facility, analysisItem, reportYear);
      }
    }
    return {
      group: group,
      selectedModel: selectedModel,
      facilityId: facility.guid,
      baselineYear: analysisItem.baselineYear
    }
  }
}

function abortError(): DOMException {
  return new DOMException('Regression model generation was cancelled.', 'AbortError');
}

export interface FacilityGroupAnalysisItem {
  group: AnalysisGroup,
  selectedModel?: JStatRegressionModel,
  facilityId: string,
  baselineYear: number
}

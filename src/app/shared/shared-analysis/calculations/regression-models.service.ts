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
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { convertOrphanedGeneratedModelToUserDefined, findEquivalentRegressionModel, getSelectedRegressionModel } from '@shared/shared-analysis/calculations/regression-model-recovery';

@Injectable({
  providedIn: 'root'
})
export class RegressionModelsService {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);

  private currentWorker: Worker | null = null;


  terminateCurrentWorker(): void {
    this.currentWorker?.terminate();
    this.currentWorker = null;
  }

  generateModels(
    group: AnalysisGroup,
    analysisItem: IdbAnalysisItem,
    facility: IdbFacility,
    meters: Array<IdbUtilityMeter>,
    meterData: Array<IdbUtilityMeterData>,
    facilityPredictorData: Array<IdbPredictorData>,
    assessmentReportVersion: AssessmentReportVersion
  ): Promise<Array<JStatRegressionModel>> {
    this.terminateCurrentWorker();

    if (typeof Worker !== 'undefined') {
      return new Promise((resolve, reject) => {
        this.currentWorker = new Worker(
          new URL('../../../platform/web-workers/regression-models.worker', import.meta.url)
        );
        this.currentWorker.onmessage = ({ data }) => {
          this.terminateCurrentWorker();
          if (!data.error) {
            resolve(data.generatedModels);
          } else {
            reject(new Error('Worker error generating regression models'));
          }
        };
        this.currentWorker.postMessage({
          group: JSON.parse(JSON.stringify(group)),
          analysisItem: JSON.parse(JSON.stringify(analysisItem)),
          facility,
          meters,
          meterData,
          facilityPredictorData,
          assessmentReportVersion,
        });
      });
    } else {
      // Fallback: no Web Worker support
      try {
        const calanderizedMeters = getCalanderizedMeterData(
          meters, meterData, facility, false,
          { energyIsSource: analysisItem.energyIsSource, neededUnits: getNeededUnits(analysisItem) },
          [], [], [facility], assessmentReportVersion, []
        );
        const calculator = new RegressionModelsCalculator(facilityPredictorData);
        return Promise.resolve(calculator.getModels(group, calanderizedMeters, facility, analysisItem));
      } catch (e) {
        return Promise.reject(e);
      }
    }
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
    //report year is determined by the latest full year of data
    let baselineYear: number = analysisItem.baselineYear;
    let facilityPredictorData: Array<IdbPredictorData> = this.accountWorkspaceQuery.getFacilityPredictorData(selectedFacility.guid);
    const selectedPredictors = selectedGroup.predictorVariables.filter(v => v.productionInAnalysis);

    let userModel: JStatRegressionModel = {
      coef: [
        selectedGroup.regressionConstant,
        ...selectedPredictors.map(v => v.regressionCoefficient)
      ],
      R2: undefined,
      SSE: undefined,
      SSR: undefined,
      SST: undefined,
      adjust_R2: undefined,
      df_model: undefined,
      df_resid: undefined,
      ybar: undefined,
      t: {
        se: undefined,
        sigmaHat: undefined,
        p: undefined
      },
      f: {
        pvalue: undefined,
        F_statistic: undefined
      },
      modelYear: selectedGroup.regressionModelYear,
      predictorVariables: selectedPredictors,
      modelId: undefined,
      isValid: false,
      modelPValue: undefined,
      modelNotes: [selectedGroup.regressionModelNotes],
      errorModeling: false,
      SEPValidation: undefined,
      SEPValidationPass: undefined,
      dataValidationNotes: [''],
      modelValidationNotes: [''],
      isUserDefinedModel: true
    };

    const validatedModel = new RegressionModelsCalculator(facilityPredictorData).setModelVaildAndNotes(userModel, reportYear, selectedFacility, baselineYear, selectedGroup);
    return validatedModel;
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

export interface FacilityGroupAnalysisItem {
  group: AnalysisGroup,
  selectedModel?: JStatRegressionModel,
  facilityId: string,
  baselineYear: number
}

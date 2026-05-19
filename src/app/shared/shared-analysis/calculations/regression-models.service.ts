import { Injectable } from '@angular/core';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AssessmentReportVersion } from 'src/app/models/idbModels/account';
import { RegressionModelsCalculator } from './regression-models-calculator';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class RegressionModelsService {

  private currentWorker: Worker | null = null;

  constructor(private predictorDataDbService: PredictorDataDbService) { }

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
          new URL('../../../web-workers/regression-models.worker', import.meta.url)
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
    autoSelect: boolean,
    previousSelectedModelId: string | undefined
  ): { updatedGroup: AnalysisGroup; newSelectedModel: JStatRegressionModel | undefined } {
    group.dateModelsGenerated = new Date();

    if (previousSelectedModelId) {
      const previousModelExists = generatedModels.find(model => model.modelId === previousSelectedModelId);
      if (previousModelExists) {
        group.selectedModelId = previousSelectedModelId;
      }
    }

    if (group.selectedModelId) {
      const selectedModel = generatedModels.find(model => model.modelId === group.selectedModelId);
      group.models = selectedModel ? [selectedModel] : [];
      if (selectedModel) {
        group.regressionConstant = selectedModel.coef[0];
        group.regressionModelYear = selectedModel.modelYear;
        group.predictorVariables.forEach(variable => {
          const coefIndex = selectedModel.predictorVariables.findIndex(pVariable => pVariable.id === variable.id);
          variable.regressionCoefficient = coefIndex !== -1 ? selectedModel.coef[coefIndex + 1] : 0;
        });
      }
    }

    if (autoSelect) {
      const bestModel = _.maxBy(generatedModels, 'adjust_R2');
      if (bestModel) {
        group.selectedModelId = bestModel.modelId;
        group.regressionConstant = bestModel.coef[0];
        group.regressionModelYear = bestModel.modelYear;
        group.predictorVariables.forEach(variable => {
          const coefIndex = bestModel.predictorVariables.findIndex(pVariable => pVariable.id === variable.id);
          variable.regressionCoefficient = coefIndex !== -1 ? bestModel.coef[coefIndex + 1] : 0;
        });
      }
      group.models = bestModel ? [bestModel] : [];
    }

    const newSelectedModel = generatedModels.find(model => model.modelId === group.selectedModelId);
    return { updatedGroup: group, newSelectedModel };
  }

  getModels(analysisGroup: AnalysisGroup, calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility, analysisItem: IdbAnalysisItem): Array<JStatRegressionModel> {
    const facilityPredictorData = this.predictorDataDbService.getByFacilityId(facility.guid);
    return new RegressionModelsCalculator(facilityPredictorData).getModels(analysisGroup, calanderizedMeters, facility, analysisItem);
  }

  getUserDefinedModel(selectedGroup: AnalysisGroup, selectedFacility: IdbFacility, analysisItem: IdbAnalysisItem, reportYear: number): JStatRegressionModel {
    //report year is determined by the latest full year of data
    let baselineYear: number = analysisItem.baselineYear;
    let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(selectedFacility.guid);
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
        selectedModel = group.models.find(model => { return model.modelId == group.selectedModelId });
        //set model validation for report year
        let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(facility.guid);
        //check p-variable ids for model object, was not getting updated on import prior to v0.14.9
        //group p-variable ids will be correctly mapped to data use them to check model variable ids and update if needed
        let groupPredictorVariableIds: Array<string> = group.predictorVariables.map(variable => variable.id);
        selectedModel.predictorVariables.forEach(modelVariable => {
          if (!groupPredictorVariableIds.includes(modelVariable.id)) {
            let matchVariable: AnalysisGroupPredictorVariable = group.predictorVariables.find(v => v.name == modelVariable.name);
            if(matchVariable) {
              modelVariable.id = matchVariable.id;
            }
          }
        });

        selectedModel = new RegressionModelsCalculator(facilityPredictorData).setModelVaildAndNotes(selectedModel, reportYear, facility, analysisItem.baselineYear, group);

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
  selectedModel: JStatRegressionModel,
  facilityId: string,
  baselineYear: number
}

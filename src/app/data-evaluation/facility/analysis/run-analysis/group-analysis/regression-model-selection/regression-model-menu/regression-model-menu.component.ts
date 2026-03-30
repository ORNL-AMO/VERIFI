import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import * as _ from 'lodash';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { Month, Months } from 'src/app/shared/form-data/months';
import { getYearsWithFullData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
@Component({
  selector: 'app-regression-model-menu',
  templateUrl: './regression-model-menu.component.html',
  styleUrls: ['./regression-model-menu.component.css'],
  standalone: false
})
export class RegressionModelMenuComponent implements OnInit {
  @Output()
  setShowUserDefinedModelInspection: EventEmitter<boolean> = new EventEmitter<boolean>();

  group: AnalysisGroup;
  selectedGroupSub: Subscription;
  yearOptions: Array<number>;
  hasLaterDate: boolean;
  showUpdateModelsModal: boolean = false;
  noValidModels: boolean;
  showConfirmPredictorChangeModel: boolean = false;
  modelingError: boolean = false;
  selectedFacility: IdbFacility;
  isFormChange: boolean;
  analysisItem: IdbAnalysisItem;
  numVariableOptions: Array<number>;
  months: Array<Month> = Months;
  changedModel: { modelId: string, oldModel: JStatRegressionModel, newModel: JStatRegressionModel } | null = null;
  showModelComparison: boolean = false;
  generatedModels: Array<JStatRegressionModel>;

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;
  constructor(private analysisDbService: AnalysisDbService, private analysisService: AnalysisService,
    private dbChangesService: DbChangesService, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private regressionsModelsService: RegressionModelsService,
    private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private sharedDataService: SharedDataService,
    private loadingService: LoadingService,
    private predictorDataDbService: PredictorDataDbService,
    private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      if (!this.isFormChange) {
        this.group = JSON.parse(JSON.stringify(group));
        this.setNumVariableOptions();
        if (this.group.models && this.group.models.length != 0) {
          this.generatedModels = this.analysisDbService.getGeneratedModelsForGroup(this.group.idbGroupId);
          this.checkModelData();
          this.checkHasValidModels();
        } else if (this.group.models == undefined) {
          if (group.predictorVariables && group.predictorVariables.length < 7) {
            this.generateModels();
          }
        } else {
          this.noValidModels = false;
        }
      } else {
        this.isFormChange = false;
      }
    });
    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeters.subscribe(calanderizedMeters => {
      this.calanderizedMeters = this.calanderizationService.getCalanderizedMetersByGroupId(this.group.idbGroupId);
      this.setYears();
      this.setUserDefinedDefaultData();
    });
  }

  ngOnDestroy() {
    this.selectedGroupSub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
  }

  setYears() {
    let fullYearsWithData: Array<number> = getYearsWithFullData(this.calanderizedMeters, this.selectedFacility);
    this.yearOptions = fullYearsWithData.filter(year => {
      return year >= this.analysisItem.baselineYear;
    })
  }

  setUserDefinedDefaultData() {
    if (!this.group.regressionModelStartMonth) {
      this.group.regressionModelStartMonth = 0;
    }
    if (!this.group.regressionModelEndMonth) {
      this.group.regressionModelEndMonth = 11;
    }
    if (!this.group.regressionStartYear) {
      this.group.regressionStartYear = this.yearOptions[0];
    }
    if (!this.group.regressionEndYear) {
      this.group.regressionEndYear = this.yearOptions[this.yearOptions.length - 1];
    }
  }

  async saveItem() {
    this.isFormChange = true;
    this.analysisItem.isAnalysisVisited = false;
    this.setShowUserDefinedModelInspection.emit(false);
    let groupIndex: number = this.analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.setNumVariableOptions();
    this.analysisItem.groups[groupIndex] = this.group;
    await firstValueFrom(this.analysisDbService.updateWithObservable(this.analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
    this.analysisService.selectedGroup.next(this.group);
  }

  changeModelType() {
    this.generatedModels = undefined;
    this.group.models = undefined;
    this.group.selectedModelId = undefined;
    this.group.dateModelsGenerated = undefined;
    this.analysisDbService.setGeneratedModelsForGroup(this.group.idbGroupId, this.generatedModels);
    if (this.group.userDefinedModel) {
      this.group.predictorVariables.forEach(variable => {
        variable.regressionCoefficient = undefined;
      });
      this.group.regressionModelYear = undefined;
      this.group.regressionConstant = undefined;
    }
    this.saveItem();
  }

  generateModels(autoSelect?: boolean) {
    const previousSelectedModelId = this.group.selectedModelId;
    let previousSelectedModel = this.group?.models?.find(model => model.modelId === previousSelectedModelId);
    this.loadingService.setLoadingMessage("Generating Regression Models...");
    this.loadingService.setLoadingStatus(true);
    setTimeout(() => {

      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
      let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      //Need calanderization here to ensure that models use site or source data based on selection
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.selectedFacility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.selectedFacility], selectedAccount.assessmentReportVersion, []);
      this.generatedModels = this.regressionsModelsService.getModels(this.group, calanderizedMeters, this.selectedFacility, this.analysisItem);
      this.analysisDbService.setGeneratedModelsForGroup(this.group.idbGroupId, this.generatedModels);
      let newSelectedModel = this.generatedModels?.find(model => model.modelId === this.group.selectedModelId);
      if (this.generatedModels) {
        this.modelingError = false;
        this.checkHasValidModels();
        this.hasLaterDate = false;
        this.group.dateModelsGenerated = new Date();

        if (previousSelectedModelId) {
          let previousModelExists = this.generatedModels.find(model => model.modelId === previousSelectedModelId);
          if (previousModelExists) {
            this.group.selectedModelId = previousSelectedModelId;
          }

          this.compareUpdatedModel(previousSelectedModel, newSelectedModel);
        }

        if (this.group.selectedModelId) {
          const selectedModel = this.generatedModels.find(model => model.modelId === this.group.selectedModelId);
          this.group.models = selectedModel ? [selectedModel] : [];
          if (selectedModel) {
            this.group.regressionConstant = selectedModel.coef[0];
            this.group.regressionModelYear = selectedModel.modelYear;
            this.group.predictorVariables.forEach(variable => {
              let coefIndex: number = selectedModel.predictorVariables.findIndex(pVariable => { return pVariable.id == variable.id });
              if (coefIndex != -1) {
                variable.regressionCoefficient = selectedModel.coef[coefIndex + 1];
              } else {
                variable.regressionCoefficient = 0;
              }
            });
          }
        }

        if (autoSelect) {
          let minPValModel: JStatRegressionModel = _.maxBy(this.generatedModels, 'adjust_R2');
          if (minPValModel) {
            this.group.selectedModelId = minPValModel.modelId;
            this.group.regressionConstant = minPValModel.coef[0];
            this.group.regressionModelYear = minPValModel.modelYear;
            this.group.predictorVariables.forEach(variable => {
              let coefIndex: number = minPValModel.predictorVariables.findIndex(pVariable => { return pVariable.id == variable.id });
              if (coefIndex != -1) {
                variable.regressionCoefficient = minPValModel.coef[coefIndex + 1];
              } else {
                variable.regressionCoefficient = 0;
              }
            });
          }
          this.group.models = minPValModel ? [minPValModel] : [];
        }
      } else {
        this.modelingError = true;
      }
      this.loadingService.setLoadingStatus(false);
      this.saveItem();
    }, 100)
  }

  compareUpdatedModel(previousModel: JStatRegressionModel, newModel: JStatRegressionModel) {
    this.changedModel = null;

    if (previousModel && newModel) {
      if (previousModel.R2 !== newModel.R2 || previousModel.adjust_R2 !== newModel.adjust_R2 || previousModel.modelPValue !== newModel.modelPValue ||
        !_.isEqual(previousModel.coef, newModel.coef)) {
        this.changedModel = {
          modelId: previousModel.modelId,
          oldModel: previousModel,
          newModel: newModel
        };
      }
    }
  }

  openModelComparisonModal() {
    this.showModelComparison = true;
  }

  closeModal() {
    this.showModelComparison = false;
  }

  updateModels() {
    this.sharedDataService.modalOpen.next(true);
    this.showUpdateModelsModal = true;
  }

  closeUpdateModelsModal() {
    this.sharedDataService.modalOpen.next(false);
    this.showUpdateModelsModal = false;
  }

  confirmUpdateModals() {
    this.generateModels();
    this.closeUpdateModelsModal();
  }

  checkHasValidModels() {
    this.noValidModels = this.generatedModels?.find(model => { return model.isValid == true }) == undefined;
  }

  checkModelData() {
    this.hasLaterDate = false;
    let modelDate: Date = new Date(this.group.dateModelsGenerated);
    let facilityPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.facilityPredictorData.getValue();
    let hasLaterDate = facilityPredictorEntries.find(predictor => {
      return new Date(predictor.modifiedDate) > modelDate
    });
    if (hasLaterDate) {
      this.hasLaterDate = true;
    } else {
      let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
      let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == this.group.idbGroupId });
      let groupMeterIds: Array<string> = groupMeters.map(meter => { return meter.guid });
      let groupMeterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(meterData => { return groupMeterIds.includes(meterData.meterId) })
      let hasLaterDate = groupMeterData.find(meterData => {
        return new Date(meterData.dbDate) > modelDate;
      });
      if (hasLaterDate) {
        this.hasLaterDate = true;
      }
    }
  }

  togglePredictor() {
    if (this.group.userDefinedModel && this.group.selectedModelId) {
      this.showConfirmPredictorChangeModel = true;
    } else {
      this.saveItem();
    }
  }

  cancelTogglePredictor() {
    let groupIndex: number = this.analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.group.predictorVariables = JSON.parse(JSON.stringify(this.analysisItem.groups[groupIndex].predictorVariables));
    this.showConfirmPredictorChangeModel = false;
  }

  confirmTogglePredictor() {
    this.group.predictorVariables.forEach(variable => {
      variable.regressionCoefficient = undefined;
    });
    this.group.models = undefined;
    this.group.selectedModelId = undefined;
    this.group.dateModelsGenerated = undefined;
    this.group.regressionModelYear = undefined;
    this.group.regressionConstant = undefined;
    this.saveItem();
    this.showConfirmPredictorChangeModel = false;
  }

  setNumVariableOptions() {
    this.numVariableOptions = new Array();
    let variableNum: number = 1;
    this.group.predictorVariables.forEach(pVariable => {
      if (pVariable.productionInAnalysis) {
        this.numVariableOptions.push(variableNum);
        variableNum++;
      }
    });
    if (this.numVariableOptions.length > 0) {
      let valueExists: number = this.numVariableOptions.find(option => {
        return option == this.group.maxModelVariables;
      });
      if (valueExists == undefined) {
        this.group.maxModelVariables = this.numVariableOptions[this.numVariableOptions.length - 1];
      }
    } else {
      this.group.maxModelVariables = 0;
    }
  }

  async generateUserDefinedModel() {
    this.setShowUserDefinedModelInspection.emit(true);
  }
}
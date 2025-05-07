import { Component, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import * as _ from 'lodash';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
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
@Component({
  selector: 'app-regression-model-menu',
  templateUrl: './regression-model-menu.component.html',
  styleUrls: ['./regression-model-menu.component.css'],
  standalone: false
})
export class RegressionModelMenuComponent implements OnInit {

  group: AnalysisGroup;
  selectedGroupSub: Subscription;
  yearOptions: Array<number>;
  showInvalid: boolean = false;
  showFailedValidationModel: boolean = true;
  hasLaterDate: boolean;
  showUpdateModelsModal: boolean = false;
  noValidModels: boolean;
  noDataValidationModels: boolean;
  showConfirmPredictorChangeModel: boolean = false;
  modelingError: boolean = false;
  selectedFacility: IdbFacility;
  isFormChange: boolean;
  analysisItem: IdbAnalysisItem;
  numVariableOptions: Array<number>;
  constructor(private analysisDbService: AnalysisDbService, private analysisService: AnalysisService,
    private dbChangesService: DbChangesService, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private regressionsModelsService: RegressionModelsService,
    private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private analysisValidationService: AnalysisValidationService,
    private sharedDataService: SharedDataService,
    private calanderizationService: CalanderizationService,
    private loadingService: LoadingService,
    private predictorDataDbService: PredictorDataDbService) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.showInvalid = this.analysisService.showInvalidModels.getValue();
    this.showFailedValidationModel = this.analysisService.showFailedValidationModels.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.yearOptions = this.calanderizationService.getYearOptionsFacility(this.selectedFacility.guid, this.analysisItem.analysisCategory);
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      if (!this.isFormChange) {
        this.group = JSON.parse(JSON.stringify(group));
        this.setNumVariableOptions();
        if (this.group.models && this.group.models.length != 0) {
          this.checkModelData();
          this.checkHasValidModels();
          this.checkFailedValidationModels();
        } else if (this.group.models == undefined) {
          this.generateModels();
        } else {
          this.noValidModels = false;
          this.noDataValidationModels = false;
        }
      } else {
        this.isFormChange = false;
      }
    });
  }

  ngOnDestroy() {
    this.selectedGroupSub.unsubscribe();
  }

  async saveItem() {
    this.isFormChange = true;
    let groupIndex: number = this.analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.group.groupErrors = this.analysisValidationService.getGroupErrors(this.group, this.analysisItem);
    this.setNumVariableOptions();
    this.analysisItem.groups[groupIndex] = this.group;
    this.analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(this.analysisItem);
    await firstValueFrom(this.analysisDbService.updateWithObservable(this.analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
    this.analysisService.selectedGroup.next(this.group);
  }

  changeModelType() {
    this.group.models = undefined;
    this.group.selectedModelId = undefined;
    this.group.dateModelsGenerated = undefined;
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
    this.loadingService.setLoadingMessage("Generating Regression Models...");
    this.loadingService.setLoadingStatus(true);
    setTimeout(() => {

      let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
      let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.selectedFacility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.selectedFacility]);

      this.group.models = this.regressionsModelsService.getModels(this.group, calanderizedMeters, this.selectedFacility, analysisItem);
      if (this.group.models) {
        this.modelingError = false;
        this.checkHasValidModels();
        this.checkFailedValidationModels();
        this.hasLaterDate = false;
        this.group.dateModelsGenerated = new Date();
        if (autoSelect) {
          let minPValModel: JStatRegressionModel = _.maxBy(this.group.models, 'adjust_R2');
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
        }
      } else {
        this.modelingError = true;
      }
      this.loadingService.setLoadingStatus(false);
      this.saveItem();
    }, 100)
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
    this.generateModels(true);
    this.closeUpdateModelsModal();
  }

  checkHasValidModels() {
    this.noValidModels = this.group.models.find(model => { return model.isValid == true }) == undefined;
    if (!this.showInvalid && this.noValidModels) {
      this.showInvalid = true;
    }
    this.saveInvalidChange();
  }

  saveInvalidChange() {
    this.analysisService.showInvalidModels.next(this.showInvalid);
  }

  checkFailedValidationModels() {
    this.noDataValidationModels = this.group.models.find(model => 
      {return model.SEPValidation.every(SEPValidation => SEPValidation.isValid) == true}) == undefined;
    if(!this.showFailedValidationModel && this.noDataValidationModels){
      this.showFailedValidationModel = true;
    }
    this.saveFailedValidationChange();
  }
  saveFailedValidationChange() {
    this.analysisService.showFailedValidationModels.next(this.showFailedValidationModel);
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
}

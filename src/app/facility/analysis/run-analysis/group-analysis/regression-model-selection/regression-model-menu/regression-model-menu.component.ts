import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAccount, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import * as _ from 'lodash';
import { AnalysisValidationService } from 'src/app/facility/analysis/analysis-validation.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
@Component({
  selector: 'app-regression-model-menu',
  templateUrl: './regression-model-menu.component.html',
  styleUrls: ['./regression-model-menu.component.css']
})
export class RegressionModelMenuComponent implements OnInit {

  group: AnalysisGroup;
  selectedGroupSub: Subscription;
  yearOptions: Array<number>;
  showInvalid: boolean = false;
  hasLaterDate: boolean;
  showUpdateModelsModal: boolean = false;
  noValidModels: boolean;
  showConfirmPredictorChangeModel: boolean = false;
  modelingError: boolean = false;
  selectedFacility: IdbFacility;
  isFormChange: boolean;
  constructor(private analysisDbService: AnalysisDbService, private analysisService: AnalysisService,
    private dbChangesService: DbChangesService, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private regressionsModelsService: RegressionModelsService, private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private analysisValidationService: AnalysisValidationService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.showInvalid = this.analysisService.showInvalidModels.getValue();
    this.yearOptions = this.utilityMeterDataDbService.getYearOptions();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      if (!this.isFormChange) {
        this.group = JSON.parse(JSON.stringify(group));
        if (this.group.models && this.group.models.length != 0) {
          this.checkModelData();
          this.checkHasValidModels();
        } else if (this.group.models == undefined) {
          this.generateModels();
        } else {

          this.noValidModels = false;
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
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.group.groupErrors = this.analysisValidationService.getGroupErrors(this.group);

    analysisItem.groups[groupIndex] = this.group;
    await this.analysisDbService.updateWithObservable(analysisItem).toPromise();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.dbChangesService.setAnalysisItems(selectedAccount, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
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
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    this.group.models = this.regressionsModelsService.getModels(this.group, calanderizedMeters, this.selectedFacility, analysisItem);
    if (this.group.models) {
      this.modelingError = false;
      this.checkHasValidModels();
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
    this.saveItem();
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

  checkModelData() {
    this.hasLaterDate = false;
    let modelDate: Date = new Date(this.group.dateModelsGenerated);
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let hasLaterDate = facilityPredictorEntries.find(predictor => {
      return new Date(predictor.dbDate) > modelDate
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
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.group.predictorVariables = JSON.parse(JSON.stringify(analysisItem.groups[groupIndex].predictorVariables));
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
}

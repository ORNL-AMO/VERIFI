import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
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
import { AnalysisService } from '../../../analysis.service';
@Component({
  selector: 'app-regression-model-selection',
  templateUrl: './regression-model-selection.component.html',
  styleUrls: ['./regression-model-selection.component.css']
})
export class RegressionModelSelectionComponent implements OnInit {

  selectedGroup: AnalysisGroup;
  showInvalid: boolean = false;
  orderDataField: string = 'R2';
  orderByDirection: 'asc' | 'desc' = 'desc';
  hasLaterDate: boolean;
  showUpdateModelsModal: boolean = false;
  noValidModels: boolean;
  selectedGroupSub: Subscription;
  constructor(private regressionsModelsService: RegressionModelsService, private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService, private predictorDbService: PredictordbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.selectedGroup = group;
      // if (this.selectedGroup.models && this.selectedGroup.models.length != 0) {
      //   this.checkModelData();
      //   this.checkHasValidModels();
      // }else{
      //   this.noValidModels = false;
      // }
    });

  }
  ngOnDestroy(){
    this.selectedGroupSub.unsubscribe();
  }

  // generateModels() {
  //   let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
  //   let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
  //   let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
  //   this.selectedGroup.models = this.regressionsModelsService.getModels(this.selectedGroup, calanderizedMeters, facility, analysisItem);
  //   this.checkHasValidModels();
  //   this.hasLaterDate = false;
  //   this.selectedGroup.dateModelsGenerated = new Date();
  //   this.selectedGroup.selectedModelId = undefined;
  //   this.saveItem();
  // }


  selectModel() {
    let selectedModel: JStatRegressionModel = this.selectedGroup.models.find(model => { return model.modelId == this.selectedGroup.selectedModelId });
    this.selectedGroup.regressionConstant = selectedModel.coef[0];
    this.selectedGroup.regressionModelYear = selectedModel.modelYear;
    this.selectedGroup.predictorVariables.forEach(variable => {
      let coefIndex: number = selectedModel.predictorVariables.findIndex(pVariable => { return pVariable.id == variable.id });
      if(coefIndex != -1){
        variable.regressionCoefficient = selectedModel.coef[coefIndex + 1];
      }else{
        variable.regressionCoefficient = 0;
      }
    });
    this.saveItem();
  }

  async saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.selectedGroup.idbGroupId });
    this.selectedGroup.groupHasError = this.analysisService.checkGroupHasError(this.selectedGroup);
    analysisItem.groups[groupIndex] = this.selectedGroup;
    await this.analysisDbService.updateWithObservable(analysisItem).toPromise();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.dbChangesService.setAnalysisItems(selectedAccount, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  // checkModelData() {
  //   this.hasLaterDate = false;
  //   let modelDate: Date = new Date(this.selectedGroup.dateModelsGenerated);
  //   let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
  //   let hasLaterDate = facilityPredictorEntries.find(predictor => {
  //     return new Date(predictor.dbDate) > modelDate
  //   });
  //   if (hasLaterDate) {
  //     this.hasLaterDate = true;
  //   } else {
  //     let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
  //     let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
  //     let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == this.selectedGroup.idbGroupId });
  //     let groupMeterIds: Array<string> = groupMeters.map(meter => { return meter.guid });
  //     let groupMeterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(meterData => { return groupMeterIds.includes(meterData.meterId) })
  //     let hasLaterDate = groupMeterData.find(meterData => {
  //       return new Date(meterData.dbDate) > modelDate;
  //     });
  //     if (hasLaterDate) {
  //       this.hasLaterDate = true;
  //     }
  //   }
  // }

  // updateModels() {
  //   this.showUpdateModelsModal = true;
  // }

  // closeUpdateModelsModal() {
  //   this.showUpdateModelsModal = false;
  // }

  // confirmUpdateModals() {
  //   this.generateModels();
  //   this.closeUpdateModelsModal();
  // }

  // checkHasValidModels() {
  //   this.noValidModels = this.selectedGroup.models.find(model => { return model.isValid == true }) == undefined;
  //   if(!this.showInvalid && this.noValidModels){
  //     this.showInvalid = true;
  //   }
  // }
}

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
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAccount, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { AnalysisCalculationsHelperService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations-helper.service';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

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
  constructor(private analysisDbService: AnalysisDbService, private analysisService: AnalysisService,
    private dbChangesService: DbChangesService, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private regressionsModelsService: RegressionModelsService, private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.yearOptions = this.analysisCalculationsHelperService.getYearOptions();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.group = group;
      if (this.group.models && this.group.models.length != 0) {
        this.checkModelData();
        this.checkHasValidModels();
      }else{
        this.noValidModels = false;
      }
    });
  }

  ngOnDestroy(){
    this.selectedGroupSub.unsubscribe();
  }

  async saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.group.groupHasError = this.analysisService.checkGroupHasError(this.group);

    analysisItem.groups[groupIndex] = this.group;
    await this.analysisDbService.updateWithObservable(analysisItem).toPromise();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.dbChangesService.setAnalysisItems(selectedAccount, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
  }

  changeModelType(){
    this.group.models = undefined;
    this.group.selectedModelId = undefined;
    this.group.dateModelsGenerated = undefined;
    this.saveItem();
  }

  generateModels() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    this.group.models = this.regressionsModelsService.getModels(this.group, calanderizedMeters, facility, analysisItem);
    // this.checkHasValidModels();
    // this.hasLaterDate = false;
    this.group.dateModelsGenerated = new Date();
    this.group.selectedModelId = undefined;
    this.saveItem();
  }

  
  updateModels() {
    this.showUpdateModelsModal = true;
  }

  closeUpdateModelsModal() {
    this.showUpdateModelsModal = false;
  }

  confirmUpdateModals() {
    this.generateModels();
    this.closeUpdateModelsModal();
  }

  checkHasValidModels() {
    this.noValidModels = this.group.models.find(model => { return model.isValid == true }) == undefined;
    if(!this.showInvalid && this.noValidModels){
      this.showInvalid = true;
    }
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
}

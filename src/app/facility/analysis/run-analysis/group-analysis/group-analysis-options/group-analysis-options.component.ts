import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AnalysisGroup, IdbAccount, IdbAnalysisItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnalysisCalculationsHelperService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations-helper.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';

@Component({
  selector: 'app-group-analysis-options',
  templateUrl: './group-analysis-options.component.html',
  styleUrls: ['./group-analysis-options.component.css']
})
export class GroupAnalysisOptionsComponent implements OnInit {

  group: AnalysisGroup;
  selectedGroupSub: Subscription;
  showUnitsWarning: boolean;
  groupHasError: boolean;
  yearOptions: Array<number>;
  missingGroupData: boolean;
  analysisItem: IdbAnalysisItem;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private utilityMeterDbService: UtilityMeterdbService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.yearOptions = this.analysisCalculationsHelperService.getYearOptions();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.group = group;
      this.setGroupError();
      this.checkUnitsWarning();
    });
  }

  ngOnDestroy() {
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

  setProductionUnits() {
    this.group.productionUnits = this.analysisDbService.getUnits(this.group.predictorVariables);
    this.checkUnitsWarning();
    this.saveItem();
  }

  checkUnitsWarning(){
    this.showUnitsWarning = (this.group.productionUnits == 'units');
  }

  setGroupError() {
    let groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getGroupMetersByGroupId(this.group.idbGroupId);
    this.missingGroupData = (groupMeters.length == 0);
  }

  setAnalysisType(){
    if(this.group.analysisType != 'regression'){
      this.group.predictorVariables.forEach(variable => {
        if(!variable.production){
          variable.productionInAnalysis = false;
        }
      });
    }
    this.changeModelType();
    this.saveItem();
  }

  changeModelType(){
    this.group.models = undefined;
    this.group.selectedModelId = undefined;
    this.group.dateModelsGenerated = undefined;
    this.saveItem();
  }
}

import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AnalysisGroup, IdbAnalysisItem, IdbUtilityMeter } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnalysisCalculationsHelperService } from 'src/app/facility/analysis/calculations/analysis-calculations-helper.service';

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
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private utilityMeterDbService: UtilityMeterdbService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }

  ngOnInit(): void {
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

  saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.group.groupHasError = this.analysisService.checkGroupHasError(this.group);
    analysisItem.groups[groupIndex] = this.group;
    this.analysisDbService.update(analysisItem);
    this.analysisDbService.setAccountAnalysisItems();
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
    this.saveItem();
  }
}

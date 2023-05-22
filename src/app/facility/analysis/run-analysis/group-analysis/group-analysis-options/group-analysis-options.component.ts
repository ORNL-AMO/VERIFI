import { Component, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAccount, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Router } from '@angular/router';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';

@Component({
  selector: 'app-group-analysis-options',
  templateUrl: './group-analysis-options.component.html',
  styleUrls: ['./group-analysis-options.component.css']
})
export class GroupAnalysisOptionsComponent implements OnInit {

  group: AnalysisGroup;
  selectedGroupSub: Subscription;
  showUnitsWarning: boolean;
  yearOptions: Array<number>;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private analysisValidationService: AnalysisValidationService,
    private router: Router) { }

  ngOnInit(): void {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.yearOptions = this.utilityMeterDataDbService.getYearOptions();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.group = group;
      this.checkUnitsWarning();
    });
  }

  ngOnDestroy() {
    this.selectedGroupSub.unsubscribe();
  }

  async saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.group.groupErrors = this.analysisValidationService.getGroupErrors(this.group);
    analysisItem.groups[groupIndex] = this.group;
    analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
    await firstValueFrom(this.analysisDbService.updateWithObservable(analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, this.facility);
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
    this.analysisService.selectedGroup.next(this.group);
  }

  setProductionUnits() {
    this.group.productionUnits = this.analysisDbService.getUnits(this.group.predictorVariables);
    this.checkUnitsWarning();
    this.saveItem();
  }

  checkUnitsWarning() {
    this.showUnitsWarning = (this.group.productionUnits == 'units');
  }

  setAnalysisType() {
    if (this.group.analysisType != 'regression') {
      this.group.predictorVariables.forEach(variable => {
        if (!variable.production) {
          variable.productionInAnalysis = false;
        }
      });
    }
    this.changeModelType();
  }

  changeModelType() {
    this.group.models = undefined;
    this.group.selectedModelId = undefined;
    this.group.dateModelsGenerated = undefined;
    this.saveItem();
  }

  goToPredictors() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + facility.id + '/utility/predictors');
  }

  goToMeterGroups() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + facility.id + '/utility/meter-groups');
  }
}

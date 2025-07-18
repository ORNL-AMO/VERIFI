import { Component, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import * as _ from 'lodash';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Router } from '@angular/router';
import { AnalysisGroup } from 'src/app/models/analysis';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
    selector: 'app-group-analysis-options',
    templateUrl: './group-analysis-options.component.html',
    styleUrls: ['./group-analysis-options.component.css'],
    standalone: false
})
export class GroupAnalysisOptionsComponent implements OnInit {

  group: AnalysisGroup;
  selectedGroupSub: Subscription;
  showUnitsWarning: boolean;
  baselineYearOptions: Array<number>;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  showInUseMessage: boolean;
  bankedAnalysisYears: Array<number>;
  bankedAnalysisItem: IdbAnalysisItem;
  bankedGroup: AnalysisGroup;
  hasModelsGenerated: boolean;
  displayEnableForm: boolean = false;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private analysisValidationService: AnalysisValidationService,
    private router: Router,
    private accountAnalysisDbService: AccountAnalysisDbService) { }

  ngOnInit(): void {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.setShowInUseMessage();
    this.setBaselineYearOptions();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.group = group;
      if (this.analysisItem.hasBanking && this.group.applyBanking) {
        this.setBankedGroup();
        this.setBankedAnalysisYearOptions();
        this.setHasModelsGenerated();
      }
    });
  }

  ngOnDestroy() {
    this.selectedGroupSub.unsubscribe();
  }

  async saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.group.groupErrors = this.analysisValidationService.getGroupErrors(this.group, analysisItem);
    analysisItem.groups[groupIndex] = this.group;
    analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
    await firstValueFrom(this.analysisDbService.updateWithObservable(analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.facility);
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
    this.analysisService.selectedGroup.next(this.group);
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
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.id + '/utility/predictors');
  }

  goToMeterGroups() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.id + '/utility/meter-groups');
  }

  setShowInUseMessage() {
    let accountAnalysisItems = this.accountAnalysisDbService.getCorrespondingAccountAnalysisItems(this.analysisItem.guid);
    if (accountAnalysisItems.length != 0 && this.analysisService.hideInUseMessage == false) {
      this.showInUseMessage = true;
    }
  }

  hideInUseMessage() {
    this.showInUseMessage = false;
    this.analysisService.hideInUseMessage = true;
  }

  setBaselineYearOptions() {
    this.baselineYearOptions = new Array();
    for (let i = this.analysisItem.baselineYear; i < this.analysisItem.reportYear; i++) {
      this.baselineYearOptions.push(i);
    }
  }

  setBankedAnalysisYearOptions() {
    this.bankedAnalysisYears = new Array();
    if (this.bankedAnalysisItem) {
      let minReportYear: number = _.min([this.bankedAnalysisItem.reportYear, this.analysisItem.reportYear])
      for (let i = this.bankedAnalysisItem.baselineYear + 1; i < minReportYear; i++) {
        this.bankedAnalysisYears.push(i);
      }
    }
  }

  setBankedGroup() {
    this.bankedAnalysisItem = this.analysisDbService.getByGuid(this.analysisItem.bankedAnalysisItemId);
    this.bankedGroup = this.bankedAnalysisItem.groups.find(group => {
      return group.idbGroupId == this.group.idbGroupId;
    });
  }

  setHasModelsGenerated() {
    if (this.group.models && this.group.models.length > 0) {
      this.hasModelsGenerated = true;
    } else {
      this.hasModelsGenerated = false;
    }
  }


  showEnableForm() {
    this.displayEnableForm = true;
  }

  cancelEnableForm() {
    this.displayEnableForm = false;
  }

  async confirmEnableForm() {
    this.analysisItem.groups.forEach(group => {
      group.models = [];
      group.selectedModelId = undefined;
      group.regressionConstant = undefined;
      group.regressionModelYear = undefined;
      group.regressionConstant = undefined;
      group.predictorVariables.forEach(variable => {
        variable.regressionCoefficient = undefined;
      })
    });
    await this.saveItem();
    this.setHasModelsGenerated();
    this.cancelEnableForm();
  }
}

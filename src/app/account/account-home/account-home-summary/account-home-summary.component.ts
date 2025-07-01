import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountHomeService } from '../account-home.service';
import * as _ from 'lodash';
import { Router } from '@angular/router';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ExportToExcelTemplateService } from 'src/app/shared/helper-services/export-to-excel-template.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-account-home-summary',
    templateUrl: './account-home-summary.component.html',
    styleUrls: ['./account-home-summary.component.css'],
    standalone: false
})
export class AccountHomeSummaryComponent implements OnInit {

  account: IdbAccount;
  accountSub: Subscription;
  disableButtons: boolean;
  waterAnalysisNeeded: boolean;
  energyAnalysisNeeded: boolean;
  latestEnergyAnalysisItem: IdbAccountAnalysisItem;
  latestWaterAnalysisItem: IdbAccountAnalysisItem;
  constructor(private accountDbService: AccountdbService, private accountHomeService: AccountHomeService,
    private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private exportToExcelTemplateService: ExportToExcelTemplateService
    ) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.setAccountStatus();
      let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
      this.disableButtons = (accountMeterData.length == 0);
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
  }

  navigateTo(urlStr: string) {
    if (urlStr != 'upload') {
      this.router.navigateByUrl('account/' + urlStr);
    } else {
      // this.router.navigateByUrl('/' + urlStr);
      this.router.navigateByUrl('/data-wizard/'+this.account.guid+'/import-data')
    }
  }

  exportData() {
    this.exportToExcelTemplateService.exportFacilityData();
  }


  setAccountStatus() {
    this.latestEnergyAnalysisItem = this.accountHomeService.latestEnergyAnalysisItem;
    this.setEnergyAnalysisNeeded();
    this.latestWaterAnalysisItem = this.accountHomeService.latestWaterAnalysisItem;
    this.setWaterAnalysisNeeded();
  }


  setEnergyAnalysisNeeded() {
    let currentDate: Date = new Date();
    if (this.latestEnergyAnalysisItem) {
      if (this.latestEnergyAnalysisItem.reportYear < currentDate.getFullYear() - 1) {
        this.energyAnalysisNeeded = true;
      } else {
        this.energyAnalysisNeeded = false;
      }
    } else if (this.account.sustainabilityQuestions.energyReductionGoal) {
      this.energyAnalysisNeeded = true;
    } else {
      this.energyAnalysisNeeded = false;
    }
  }

  setWaterAnalysisNeeded() {
    let currentDate: Date = new Date();
    if (this.latestWaterAnalysisItem) {
      if (this.latestWaterAnalysisItem.reportYear < currentDate.getFullYear() - 1) {
        this.waterAnalysisNeeded = true;
      } else {
        this.waterAnalysisNeeded = false;
      }
    } else if (this.account.sustainabilityQuestions.waterReductionGoal) {
      this.waterAnalysisNeeded = true;
    } else {
      this.waterAnalysisNeeded = false;
    }
  }

  goToDataManagement(){
    this.router.navigateByUrl('/data-wizard/' + this.account.guid + '/import-data');
  }
}

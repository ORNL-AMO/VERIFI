import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import * as _ from 'lodash';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';

@Component({
  selector: 'app-account-analysis-dashboard',
  templateUrl: './account-analysis-dashboard.component.html',
  styleUrls: ['./account-analysis-dashboard.component.css']
})
export class AccountAnalysisDashboardComponent implements OnInit {

  accountAnalysisItemsSub: Subscription;

  baselineYearError: boolean;
  yearOptions: Array<number>;
  selectedAccount: IdbAccount;
  analysisItemsList: Array<{
    year: number,
    analysisItems: Array<IdbAccountAnalysisItem>,
    hasSelectedItem: boolean
  }>;
  showDetail: boolean;
  showDetailSub: Subscription;
  constructor(private router: Router, private accountAnalysisDbService: AccountAnalysisDbService, private toastNotificationService: ToastNotificationsService,
    private accountDbService: AccountdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private dbChangesService: DbChangesService, private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountAnalysisItemsSub = this.accountAnalysisDbService.accountAnalysisItems.subscribe(items => {
      this.setAnalysisItemsList(items);
    });

    this.yearOptions = this.utilityMeterDataDbService.getYearOptions(true);
    if (this.yearOptions) {
      this.baselineYearError = this.yearOptions[0] > this.selectedAccount.sustainabilityQuestions.energyReductionBaselineYear
    }
   
    this.showDetailSub = this.analysisService.showDetail.subscribe(showDetail => {
      this.showDetail = showDetail;
    })
  }

  ngOnDestroy() {
    this.accountAnalysisItemsSub.unsubscribe();
    this.showDetailSub.unsubscribe();
  }

  async createAnalysis() {
    let newItem: IdbAccountAnalysisItem = this.accountAnalysisDbService.getNewAccountAnalysisItem();
    let addedItem: IdbAccountAnalysisItem = await this.accountAnalysisDbService.addWithObservable(newItem).toPromise();
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount);
    this.accountAnalysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Item Created', undefined, undefined, false, "bg-success");
    this.router.navigateByUrl('account/analysis/setup');
  }
  

  setAnalysisItemsList(accountAnalysisItems: Array<IdbAccountAnalysisItem>) {
    this.analysisItemsList = new Array();
    let years: Array<number> = accountAnalysisItems.map(item => { return item.reportYear });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, 'desc');
    years.forEach(year => {
      let yearAnalysisItems: Array<IdbAccountAnalysisItem> = accountAnalysisItems.filter(item => { return item.reportYear == year });
      this.analysisItemsList.push({
        year: year,
        analysisItems: yearAnalysisItems,
        hasSelectedItem: yearAnalysisItems.findIndex((item: IdbAccountAnalysisItem) => { return item.selectedYearAnalysis == true }) != -1
      });
    })
  }

  saveShowDetails() {
    this.analysisService.showDetail.next(this.showDetail);
  }
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import * as _ from 'lodash';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

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
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService, private analysisService: AnalysisService,
    private calendarizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountAnalysisItemsSub = this.accountAnalysisDbService.accountAnalysisItems.subscribe(items => {
      this.setAnalysisItemsList(items);
    });

    this.yearOptions = this.calendarizationService.getYearOptionsAccount();
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
    let addedItem: IdbAccountAnalysisItem = await firstValueFrom(this.accountAnalysisDbService.addWithObservable(newItem));
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount, false);
    this.accountAnalysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Item Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('account/analysis/setup');
  }


  async setAnalysisItemsList(accountAnalysisItems: Array<IdbAccountAnalysisItem>) {
    this.analysisItemsList = new Array();
    let years: Array<number> = accountAnalysisItems.map(item => { return item.reportYear });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, 'desc');
    for (let i = 0; i < years.length; i++) {
      let year: number = years[i];
      let yearAnalysisItems: Array<IdbAccountAnalysisItem> = accountAnalysisItems.filter(item => { return item.reportYear == year });
      for (let x = 0; x < yearAnalysisItems.length; x++) {
        let accountAnalysisItem: IdbAccountAnalysisItem = yearAnalysisItems[i];
        
      }
      this.analysisItemsList.push({
        year: year,
        analysisItems: yearAnalysisItems,
        hasSelectedItem: yearAnalysisItems.findIndex((item: IdbAccountAnalysisItem) => { return item.selectedYearAnalysis == true }) != -1
      });
    }
  }

  saveShowDetails() {
    this.analysisService.showDetail.next(this.showDetail);
  }
}

import { Component } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';

@Component({
  selector: 'app-account-analysis-water-dashboard',
  templateUrl: './account-analysis-water-dashboard.component.html',
  styleUrls: ['./account-analysis-water-dashboard.component.css']
})
export class AccountAnalysisWaterDashboardComponent {
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
  constructor(private accountAnalysisDbService: AccountAnalysisDbService,
    private calendarizationService: CalanderizationService, private analysisService: AnalysisService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountAnalysisItemsSub = this.accountAnalysisDbService.accountAnalysisItems.subscribe(items => {
      this.setAnalysisItemsList(items);
    });

    this.yearOptions = this.calendarizationService.getYearOptionsAccount();
    if (this.yearOptions) {
      this.baselineYearError = this.yearOptions[0] > this.selectedAccount.sustainabilityQuestions.waterReductionBaselineYear
    }

    this.showDetailSub = this.analysisService.showDetail.subscribe(showDetail => {
      this.showDetail = showDetail;
    })
  }

  ngOnDestroy() {
    this.accountAnalysisItemsSub.unsubscribe();
    this.showDetailSub.unsubscribe();
  }


  async setAnalysisItemsList(accountAnalysisItems: Array<IdbAccountAnalysisItem>) {
    this.analysisItemsList = new Array();
    let energyItems: Array<IdbAccountAnalysisItem> = accountAnalysisItems.filter(item => {return item.analysisCategory == 'water'});
    let years: Array<number> = energyItems.map(item => { return item.reportYear });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, 'desc');
    for (let i = 0; i < years.length; i++) {
      let year: number = years[i];
      let yearAnalysisItems: Array<IdbAccountAnalysisItem> = energyItems.filter(item => { return item.reportYear == year });
      this.analysisItemsList.push({
        year: year,
        analysisItems: yearAnalysisItems,
        hasSelectedItem: yearAnalysisItems.findIndex((item: IdbAccountAnalysisItem) => { return item.selectedYearAnalysis == true }) != -1
      });
    }
  }
}

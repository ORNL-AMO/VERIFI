import { Component } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-account-analysis-energy-dashboard',
    templateUrl: './account-analysis-energy-dashboard.component.html',
    styleUrls: ['./account-analysis-energy-dashboard.component.css'],
    standalone: false
})
export class AccountAnalysisEnergyDashboardComponent {
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

    this.yearOptions = this.calendarizationService.getYearOptionsAccount('energy');
    if (this.yearOptions && this.selectedAccount.sustainabilityQuestions.energyReductionGoal) {
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


  async setAnalysisItemsList(accountAnalysisItems: Array<IdbAccountAnalysisItem>) {
    this.analysisItemsList = new Array();
    let energyItems: Array<IdbAccountAnalysisItem> = accountAnalysisItems.filter(item => {return item.analysisCategory == 'energy'});
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

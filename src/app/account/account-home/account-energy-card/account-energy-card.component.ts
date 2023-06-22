import { Component } from '@angular/core';
import { AccountHomeService } from '../account-home.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';

@Component({
  selector: 'app-account-energy-card',
  templateUrl: './account-energy-card.component.html',
  styleUrls: ['./account-energy-card.component.css']
})
export class AccountEnergyCardComponent {

  monthlyEnergyAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyEnergyAnalysisDataSub: Subscription;
  calculatingEnergy: boolean | 'error';
  calculatingEnergySub: Subscription;
  calculatingOverview: boolean | 'error';
  calculatingOverviewSub: Subscription;
  annualEnergyAnalysisSummary: Array<AnnualAnalysisSummary>;
  annualEnergyAnalysisSummarySub: Subscription;

  latestEnergyAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  selectedAccountSub: Subscription;
  carouselIndex: number = 0;
  accountOverviewData: AccountOverviewData;
  accountOverviewDataSub: Subscription;
  energyUnit: string;
  constructor(private accountHomeService: AccountHomeService,
    private accountDbService: AccountdbService,
    private sharedDataService: SharedDataService) {
  }

  ngOnInit() {
    this.carouselIndex = this.sharedDataService.energyHomeCarouselIndex.getValue();

    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.latestEnergyAnalysisItem = this.accountHomeService.latestEnergyAnalysisItem;
      this.account = val;
      this.energyUnit = val.energyUnit;
    });
    this.calculatingEnergySub = this.accountHomeService.calculatingEnergy.subscribe(val => {
      this.calculatingEnergy = val;
    });
    this.calculatingOverviewSub = this.accountHomeService.calculatingOverview.subscribe(val => {
      this.calculatingOverview = val;
    });
    this.accountOverviewDataSub = this.accountHomeService.accountOverviewData.subscribe(val => {
      this.accountOverviewData = val;
    });

    this.monthlyEnergyAnalysisDataSub = this.accountHomeService.monthlyEnergyAnalysisData.subscribe(val => {
      this.monthlyEnergyAnalysisData = val;
    });
    this.annualEnergyAnalysisSummarySub = this.accountHomeService.annualEnergyAnalysisSummary.subscribe(val => {
      this.annualEnergyAnalysisSummary = val;
    });
  }

  ngOnDestroy() {
    this.calculatingEnergySub.unsubscribe();
    this.monthlyEnergyAnalysisDataSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    this.annualEnergyAnalysisSummarySub.unsubscribe();
    this.calculatingOverviewSub.unsubscribe();
    this.accountOverviewDataSub.unsubscribe();
  }

  goNext() {
    this.carouselIndex++;
    this.sharedDataService.energyHomeCarouselIndex.next(this.carouselIndex);
  }

  goBack() {
    this.carouselIndex--;
    this.sharedDataService.energyHomeCarouselIndex.next(this.carouselIndex);
  }

  goToIndex(index: number) {
    this.carouselIndex = index;
    this.sharedDataService.energyHomeCarouselIndex.next(this.carouselIndex);
  }
}

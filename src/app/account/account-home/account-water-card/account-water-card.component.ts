import { Component } from '@angular/core';
import { AccountHomeService } from '../account-home.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-account-water-card',
    templateUrl: './account-water-card.component.html',
    styleUrls: ['./account-water-card.component.css'],
    standalone: false
})
export class AccountWaterCardComponent {

  monthlyWaterAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyWaterAnalysisDataSub: Subscription;
  annualWaterAnalysisSummary: Array<AnnualAnalysisSummary>;
  annualWaterAnalysisSummarySub: Subscription;
  calculatingWater: boolean | 'error';
  calculatingWaterSub: Subscription;
  calculatingOverview: boolean | 'error';
  calculatingOverviewSub: Subscription;

  latestWaterAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  selectedAccountSub: Subscription;
  carouselIndex: number = 0;
  accountOverviewData: AccountOverviewData;
  accountOverviewDataSub: Subscription;
  waterUnit: string;
  constructor(private accountHomeService: AccountHomeService,
    private accountDbService: AccountdbService,
    private sharedDataService: SharedDataService) {
  }

  ngOnInit() {
    this.carouselIndex = this.sharedDataService.waterHomeCarouselIndex.getValue();
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.latestWaterAnalysisItem = this.accountHomeService.latestWaterAnalysisItem;
      this.account = val;
      this.waterUnit = this.account.volumeLiquidUnit;
    });

    this.calculatingWaterSub = this.accountHomeService.calculatingWater.subscribe(val => {
      this.calculatingWater = val;
    });

    this.calculatingOverviewSub = this.accountHomeService.calculatingOverview.subscribe(val => {
      this.calculatingOverview = val;
    });

    this.accountOverviewDataSub = this.accountHomeService.accountOverviewData.subscribe(val => {
      this.accountOverviewData = val;
    });

    this.monthlyWaterAnalysisDataSub = this.accountHomeService.monthlyWaterAnalysisData.subscribe(val => {
      this.monthlyWaterAnalysisData = val;
    });

    this.annualWaterAnalysisSummarySub = this.accountHomeService.annualWaterAnalysisSummary.subscribe(val => {
      this.annualWaterAnalysisSummary = val;
    });
  }

  ngOnDestroy() {
    this.calculatingWaterSub.unsubscribe();
    this.monthlyWaterAnalysisDataSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    this.annualWaterAnalysisSummarySub.unsubscribe();
    this.calculatingOverviewSub.unsubscribe();
    this.accountOverviewDataSub.unsubscribe();
  }

  goNext() {
    this.carouselIndex++;
    this.sharedDataService.waterHomeCarouselIndex.next(this.carouselIndex);
  }

  goBack() {
    this.carouselIndex--;
    this.sharedDataService.waterHomeCarouselIndex.next(this.carouselIndex);
  }

  goToIndex(index: number) {
    this.carouselIndex = index;
    this.sharedDataService.waterHomeCarouselIndex.next(this.carouselIndex);
  }
}

import { Component } from '@angular/core';
import { AccountHomeService } from '../account-home.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-account-water-card',
  templateUrl: './account-water-card.component.html',
  styleUrls: ['./account-water-card.component.css']
})
export class AccountWaterCardComponent {

  monthlyWaterAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyWaterAnalysisDataSub: Subscription;
  calculatingWater: boolean | 'error';
  calculatingWaterSub: Subscription;

  latestWaterAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  selectedAccountSub: Subscription;
  carouselIndex: number = 0;
  constructor(private accountHomeService: AccountHomeService,
    private accountDbService: AccountdbService) {
  }

  ngOnInit() {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.latestWaterAnalysisItem = this.accountHomeService.latestWaterAnalysisItem;
      this.account = val;
    });

    this.calculatingWaterSub = this.accountHomeService.calculatingWater.subscribe(val => {
      this.calculatingWater = val;
    });

    this.monthlyWaterAnalysisDataSub = this.accountHomeService.monthlyWaterAnalysisData.subscribe(val => {
      this.monthlyWaterAnalysisData = val;
    });
  }

  ngOnDestroy() {
    this.calculatingWaterSub.unsubscribe();
    this.monthlyWaterAnalysisDataSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  goNext() {
    this.carouselIndex++;
  }

  goBack() {
    this.carouselIndex--;
  }
}

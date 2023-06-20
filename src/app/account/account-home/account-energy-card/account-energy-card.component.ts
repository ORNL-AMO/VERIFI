import { Component } from '@angular/core';
import { AccountHomeService } from '../account-home.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

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

  latestEnergyAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  selectedAccountSub: Subscription;
  carouselIndex: number = 0;
  constructor(private accountHomeService: AccountHomeService,
    private accountDbService: AccountdbService) {
  }

  ngOnInit() {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.latestEnergyAnalysisItem = this.accountHomeService.latestEnergyAnalysisItem;
      this.account = val;
    });
    this.calculatingEnergySub = this.accountHomeService.calculatingEnergy.subscribe(val => {
      this.calculatingEnergy = val;
    });

    this.monthlyEnergyAnalysisDataSub = this.accountHomeService.monthlyEnergyAnalysisData.subscribe(val => {
      this.monthlyEnergyAnalysisData = val;
    });
  }

  ngOnDestroy() {
    this.calculatingEnergySub.unsubscribe();
    this.monthlyEnergyAnalysisDataSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  goNext() {
    this.carouselIndex++;
  }

  goBack() {
    this.carouselIndex--;
  }
}

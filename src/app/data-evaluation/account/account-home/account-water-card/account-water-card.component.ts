import { Component, computed, inject, Signal } from '@angular/core';
import { AccountHomeService } from '../account-home.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-account-water-card',
    templateUrl: './account-water-card.component.html',
    styleUrls: ['./account-water-card.component.css'],
    standalone: false
})
export class AccountWaterCardComponent {
  private accountHomeService: AccountHomeService = inject(AccountHomeService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);

  monthlyWaterAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.accountHomeService.monthlyWaterAnalysisData, { initialValue: [] });
  calculatingWater: Signal<boolean | 'error'> = toSignal(this.accountHomeService.calculatingWater, { initialValue: false });
  calculatingOverview: Signal<boolean | 'error'> = toSignal(this.accountHomeService.calculatingOverview, { initialValue: false });
  annualWaterAnalysisSummary: Signal<Array<AnnualAnalysisSummary>> = toSignal(this.accountHomeService.annualWaterAnalysisSummary, { initialValue: [] });
  latestWaterAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestWaterAnalysisItem, { initialValue: null });
  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount, { initialValue: null });
  carouselIndex: Signal<number> = toSignal(this.sharedDataService.waterHomeCarouselIndex, { initialValue: 0 });
  accountOverviewData: Signal<AccountOverviewData> = toSignal(this.accountHomeService.accountOverviewData, { initialValue: null });

  goNext() {
    this.sharedDataService.waterHomeCarouselIndex.next(this.carouselIndex() + 1);
  }

  goBack() {
    this.sharedDataService.waterHomeCarouselIndex.next(this.carouselIndex() - 1);
  }

  goToIndex(index: number) {
    this.sharedDataService.waterHomeCarouselIndex.next(index);
  }
}

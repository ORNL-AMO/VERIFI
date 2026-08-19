import { AccountWorkspaceStore } from '@app/account-workspace/account-workspace.store';
import { Component, inject, Signal } from '@angular/core';
import { AccountHomeService } from '@v0/data-evaluation/account/account-home/account-home.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@app/models/analysis';
import { SharedDataService } from '@app/shared/helper-services/shared-data.service';
import { AccountOverviewData } from '@app/calculations/dashboard-calculations/accountOverviewClass';
import { IdbAccount } from '@app/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@app/models/idbModels/accountAnalysisItem';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-account-energy-card',
  templateUrl: './account-energy-card.component.html',
  styleUrls: ['./account-energy-card.component.css'],
  standalone: false
})
export class AccountEnergyCardComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private accountHomeService: AccountHomeService = inject(AccountHomeService);
  private sharedDataService: SharedDataService = inject(SharedDataService);

  monthlyEnergyAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.accountHomeService.monthlyEnergyAnalysisData, { initialValue: [] });
  calculatingEnergy: Signal<boolean | 'error'> = toSignal(this.accountHomeService.calculatingEnergy, { initialValue: false });
  calculatingOverview: Signal<boolean | 'error'> = toSignal(this.accountHomeService.calculatingOverview, { initialValue: false });
  annualEnergyAnalysisSummary: Signal<Array<AnnualAnalysisSummary>> = toSignal(this.accountHomeService.annualEnergyAnalysisSummary, { initialValue: [] });
  latestEnergyAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestEnergyAnalysisItem, { initialValue: null });
  account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  carouselIndex: Signal<number> = toSignal(this.sharedDataService.energyHomeCarouselIndex, { initialValue: 0 });
  accountOverviewData: Signal<AccountOverviewData> = toSignal(this.accountHomeService.accountOverviewData, { initialValue: null });

  goNext() {
    this.sharedDataService.energyHomeCarouselIndex.next(this.carouselIndex() + 1);
  }

  goBack() {
    this.sharedDataService.energyHomeCarouselIndex.next(this.carouselIndex() - 1);
  }

  goToIndex(index: number) {
    this.sharedDataService.energyHomeCarouselIndex.next(index);
  }
}

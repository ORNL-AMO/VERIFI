import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, computed, EventEmitter, inject, Output, Signal } from '@angular/core';
import { AccountHomeService, CombinedCalculationState, getCombinedCalculationState } from '@v0/data-evaluation/account/account-home/account-home.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { AccountOverviewData } from '@domain/calculations/dashboard-calculations/accountOverviewClass';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-account-energy-card',
  templateUrl: './account-energy-card.component.html',
  styleUrls: ['./account-energy-card.component.css'],
  standalone: false
})
export class AccountEnergyCardComponent {
  @Output() retryRequested: EventEmitter<void> = new EventEmitter<void>();
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
  calculationState: Signal<CombinedCalculationState> = computed(() => getCombinedCalculationState(this.calculatingEnergy(), this.calculatingOverview()));
  calculationLoading: Signal<boolean> = computed(() => this.calculationState() === 'loading');
  calculationError: Signal<boolean> = computed(() => this.calculationState() === 'error');
  calculationReady: Signal<boolean> = computed(() => this.calculationState() === 'ready');

  retryCalculations(): void {
    this.retryRequested.emit();
  }

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

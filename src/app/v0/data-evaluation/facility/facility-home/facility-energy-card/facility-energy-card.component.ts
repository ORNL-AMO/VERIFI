import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject, Signal } from '@angular/core';
import { FacilityHomeService } from '@v0/data-evaluation/facility/facility-home/facility-home.service';
import { SharedDataService } from '@app/shared/helper-services/shared-data.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { FacilityOverviewData } from '@domain/calculations/dashboard-calculations/facilityOverviewClass';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-facility-energy-card',
  templateUrl: './facility-energy-card.component.html',
  styleUrls: ['./facility-energy-card.component.css'],
  standalone: false
})
export class FacilityEnergyCardComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private sharedDataService: SharedDataService = inject(SharedDataService);

  monthlyEnergyAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.facilityHomeService.monthlyFacilityEnergyAnalysisData, { initialValue: undefined });
  calculatingEnergy: Signal<boolean | 'error'> = toSignal(this.facilityHomeService.calculatingEnergy, { initialValue: true });
  calculatingOverview: Signal<boolean | 'error'> = toSignal(this.facilityHomeService.calculatingOverview, { initialValue: true });

  annualEnergyAnalysisSummary: Signal<Array<AnnualAnalysisSummary>> = toSignal(this.facilityHomeService.annualEnergyAnalysisSummary, { initialValue: undefined });

  latestEnergyAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  carouselIndex: Signal<number> = toSignal(this.sharedDataService.energyHomeCarouselIndex, { initialValue: 0 });
  facilityOverviewData: Signal<FacilityOverviewData> = toSignal(this.facilityHomeService.facilityOverviewData, { initialValue: undefined });

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

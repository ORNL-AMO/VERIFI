import { Component, inject, Signal } from '@angular/core';
import { FacilityHomeService } from '../facility-home.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-facility-energy-card',
  templateUrl: './facility-energy-card.component.html',
  styleUrls: ['./facility-energy-card.component.css'],
  standalone: false
})
export class FacilityEnergyCardComponent {
  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private facilityDbService: FacilitydbService= inject(FacilitydbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);

  monthlyEnergyAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.facilityHomeService.monthlyFacilityEnergyAnalysisData, { initialValue: undefined });
  calculatingEnergy: Signal<boolean | 'error'> = toSignal(this.facilityHomeService.calculatingEnergy, { initialValue: true });
  calculatingOverview: Signal<boolean | 'error'> = toSignal(this.facilityHomeService.calculatingOverview, { initialValue: true });

  annualEnergyAnalysisSummary: Signal<Array<AnnualAnalysisSummary>> = toSignal(this.facilityHomeService.annualEnergyAnalysisSummary, { initialValue: undefined });

  latestEnergyAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
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

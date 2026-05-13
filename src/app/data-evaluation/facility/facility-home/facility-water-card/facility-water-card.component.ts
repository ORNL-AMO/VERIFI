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
    selector: 'app-facility-water-card',
    templateUrl: './facility-water-card.component.html',
    styleUrls: ['./facility-water-card.component.css'],
    standalone: false
})
export class FacilityWaterCardComponent {
  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);

  monthlyWaterAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.facilityHomeService.monthlyFacilityWaterAnalysisData, { initialValue: undefined });
  calculatingWater: Signal<boolean | 'error'> = toSignal(this.facilityHomeService.calculatingWater, { initialValue: true });
  calculatingOverview: Signal<boolean | 'error'> = toSignal(this.facilityHomeService.calculatingOverview, { initialValue: true });
  annualWaterAnalysisSummary: Signal<Array<AnnualAnalysisSummary>> = toSignal(this.facilityHomeService.annualWaterAnalysisSummary, { initialValue: undefined });
  latestWaterAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestWaterAnalysisItem, { initialValue: undefined });
  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  carouselIndex: Signal<number> = toSignal(this.sharedDataService.waterHomeCarouselIndex, { initialValue: 0 });
  facilityOverviewData: Signal<FacilityOverviewData> = toSignal(this.facilityHomeService.facilityOverviewData, { initialValue: undefined });

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

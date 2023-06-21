import { Component } from '@angular/core';
import { FacilityHomeService } from '../facility-home.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility-water-card',
  templateUrl: './facility-water-card.component.html',
  styleUrls: ['./facility-water-card.component.css']
})
export class FacilityWaterCardComponent {
  monthlyWaterAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyWaterAnalysisDataSub: Subscription;
  annualWaterAnalysisSummary: Array<AnnualAnalysisSummary>;
  annualWaterAnalysisSummarySub: Subscription;
  calculatingWater: boolean | 'error';
  calculatingWaterSub: Subscription;

  latestWaterAnalysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  selectedFacilitySub: Subscription;
  carouselIndex: number = 0;
  constructor(private facilityHomeService: FacilityHomeService,
    private facilityDbService: FacilitydbService,
    private sharedDataService: SharedDataService) {
  }

  ngOnInit() {
    this.carouselIndex = this.sharedDataService.waterHomeCarouselIndex.getValue();
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.latestWaterAnalysisItem = this.facilityHomeService.latestWaterAnalysisItem;
      this.facility = val;
    });

    this.calculatingWaterSub = this.facilityHomeService.calculatingWater.subscribe(val => {
      this.calculatingWater = val;
    });

    this.monthlyWaterAnalysisDataSub = this.facilityHomeService.monthlyFacilityWaterAnalysisData.subscribe(val => {
      this.monthlyWaterAnalysisData = val;
    });

    this.annualWaterAnalysisSummarySub = this.facilityHomeService.annualWaterAnalysisSummary.subscribe(val => {
      this.annualWaterAnalysisSummary = val;
    });
  }

  ngOnDestroy() {
    this.calculatingWaterSub.unsubscribe();
    this.monthlyWaterAnalysisDataSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.annualWaterAnalysisSummarySub.unsubscribe();
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

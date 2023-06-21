import { Component } from '@angular/core';
import { FacilityHomeService } from '../facility-home.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facility-energy-card',
  templateUrl: './facility-energy-card.component.html',
  styleUrls: ['./facility-energy-card.component.css']
})
export class FacilityEnergyCardComponent {

  monthlyEnergyAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyEnergyAnalysisDataSub: Subscription;
  calculatingEnergy: boolean | 'error';
  calculatingEnergySub: Subscription;
  annualEnergyAnalysisSummary: Array<AnnualAnalysisSummary>;
  annualEnergyAnalysisSummarySub: Subscription;

  latestEnergyAnalysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  selectedFacilitySub: Subscription;
  carouselIndex: number = 0;
  constructor(private facilityHomeService: FacilityHomeService,
    private facilityDbService: FacilitydbService,
    private sharedDataService: SharedDataService) {
  }

  ngOnInit() {
    this.carouselIndex = this.sharedDataService.energyHomeCarouselIndex.getValue();

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.latestEnergyAnalysisItem = this.facilityHomeService.latestEnergyAnalysisItem;
      this.facility = val;
    });
    this.calculatingEnergySub = this.facilityHomeService.calculatingEnergy.subscribe(val => {
      this.calculatingEnergy = val;
    });

    this.monthlyEnergyAnalysisDataSub = this.facilityHomeService.monthlyFacilityEnergyAnalysisData.subscribe(val => {
      this.monthlyEnergyAnalysisData = val;
    });
    this.annualEnergyAnalysisSummarySub = this.facilityHomeService.annualEnergyAnalysisSummary.subscribe(val => {
      this.annualEnergyAnalysisSummary = val;
    });
  }

  ngOnDestroy() {
    this.calculatingEnergySub.unsubscribe();
    this.monthlyEnergyAnalysisDataSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.annualEnergyAnalysisSummarySub.unsubscribe();
  }

  goNext() {
    this.carouselIndex++;
    this.sharedDataService.energyHomeCarouselIndex.next(this.carouselIndex);
  }

  goBack() {
    this.carouselIndex--;
    this.sharedDataService.energyHomeCarouselIndex.next(this.carouselIndex);
  }

  goToIndex(index: number) {
    this.carouselIndex = index;
    this.sharedDataService.energyHomeCarouselIndex.next(this.carouselIndex);
  }
}

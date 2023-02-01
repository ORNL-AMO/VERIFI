import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { FacilityOverviewService } from '../facility-overview.service';

@Component({
  selector: 'app-facility-water-overview',
  templateUrl: './facility-water-overview.component.html',
  styleUrls: ['./facility-water-overview.component.css']
})
export class FacilityWaterOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  facilityId: string;
  selectedFacilitySub: Subscription;
  waterUnit: string;
  utilityUsageSummaryData: UtilityUsageSummaryData;
  utilityUsageSummaryDataSub: Subscription;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  monthlySourceDataSub: Subscription;
  calanderizedMeters: Array<CalanderizedMeter>;
  constructor(private facilityOverviewService: FacilityOverviewService, private facilityDbService: FacilitydbService) { }


  ngOnInit(): void {
    this.calanderizedMeters = this.facilityOverviewService.calanderizedMeters;

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facilityId = val.guid;
      this.waterUnit = val.volumeLiquidUnit;
    })
    this.calculatingSub = this.facilityOverviewService.calculatingWater.subscribe(val => {
      this.calculating = val;
    })

    this.accountFacilitiesSummarySub = this.facilityOverviewService.waterMeterSummaryData.subscribe(summaryData => {
      if (summaryData && summaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(summaryData.allMetersLastBill.year, summaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(summaryData.allMetersLastBill.year - 1, summaryData.allMetersLastBill.monthNumValue + 1);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    });
    this.utilityUsageSummaryDataSub = this.facilityOverviewService.waterUtilityUsageSummaryData.subscribe(utilityUsageSummaryData => {
      this.utilityUsageSummaryData = utilityUsageSummaryData;
    });

    this.yearMonthDataSub = this.facilityOverviewService.waterYearMonthData.subscribe(yearMonthData => {
      this.yearMonthData = yearMonthData;
    });
    this.monthlySourceDataSub = this.facilityOverviewService.waterMonthlySourceData.subscribe(monthlySourceData => {
      this.monthlySourceData = monthlySourceData;
    })
  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
    this.calculatingSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.utilityUsageSummaryDataSub.unsubscribe();
    this.yearMonthDataSub.unsubscribe();
    this.monthlySourceDataSub.unsubscribe();
  }


}

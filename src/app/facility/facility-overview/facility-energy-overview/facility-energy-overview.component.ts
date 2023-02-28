import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { FacilityMeterSummaryData, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { FacilityOverviewService } from '../facility-overview.service';



@Component({
  selector: 'app-facility-energy-overview',
  templateUrl: './facility-energy-overview.component.html',
  styleUrls: ['./facility-energy-overview.component.css']
})
export class FacilityEnergyOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  facilityId: string;
  selectedFacilitySub: Subscription;
  utilityUsageSummaryData: UtilityUsageSummaryData;
  utilityUsageSummaryDataSub: Subscription;
  energyUnit: string;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  monthlySourceDataSub: Subscription;
  calanderizedMeters: Array<CalanderizedMeter>;
  metersSummary: FacilityMeterSummaryData;
  metersSummarySub: Subscription;

  dateRange: {startDate: Date, endDate: Date};
  dateRangeSub: Subscription;
  constructor(private facilityOverviewService: FacilityOverviewService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.calanderizedMeters = this.facilityOverviewService.calanderizedMeters;
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facilityId = val.guid;
      this.energyUnit = val.energyUnit;
    });

    this.calculatingSub = this.facilityOverviewService.calculatingEnergy.subscribe(val => {
      this.calculating = val;
    })

    this.accountFacilitiesSummarySub = this.facilityOverviewService.energyMeterSummaryData.subscribe(summaryData => {
      if (summaryData && summaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(summaryData.allMetersLastBill.year, summaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(summaryData.allMetersLastBill.year - 1, summaryData.allMetersLastBill.monthNumValue + 1);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    });

    this.utilityUsageSummaryDataSub = this.facilityOverviewService.energyUtilityUsageSummaryData.subscribe(utilityUsageSummaryData => {
      this.utilityUsageSummaryData = utilityUsageSummaryData;
    });

    this.yearMonthDataSub = this.facilityOverviewService.energyYearMonthData.subscribe(yearMonthData => {
      this.yearMonthData = yearMonthData;
    });

    this.monthlySourceDataSub = this.facilityOverviewService.energyMonthlySourceData.subscribe(monthlySourceData => {
      this.monthlySourceData = monthlySourceData;
    });
    this.metersSummarySub = this.facilityOverviewService.energyMeterSummaryData.subscribe(metersSummary => {
      this.metersSummary = metersSummary;
    });

    this.dateRangeSub = this.facilityOverviewService.dateRange.subscribe(val => {
      this.dateRange = val;
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
    this.calculatingSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.utilityUsageSummaryDataSub.unsubscribe();
    this.yearMonthDataSub.unsubscribe();
    this.monthlySourceDataSub.unsubscribe();
    this.metersSummarySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
  }

}

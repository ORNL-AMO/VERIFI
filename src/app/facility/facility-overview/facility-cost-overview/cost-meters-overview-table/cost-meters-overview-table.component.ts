import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { FacilityOverviewService } from '../../facility-overview.service';

@Component({
  selector: 'app-cost-meters-overview-table',
  templateUrl: './cost-meters-overview-table.component.html',
  styleUrls: ['./cost-meters-overview-table.component.css']
})
export class CostMetersOverviewTableComponent implements OnInit {


  facilityMeterSummaryData: FacilityMeterSummaryData;
  facilityMeterSummaryDataSub: Subscription;
  constructor(
    private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.facilityMeterSummaryDataSub = this.facilityOverviewService.costsMeterSummaryData.subscribe(val => {
      this.facilityMeterSummaryData = val;
    });
  }

  ngOnDestroy() {
    this.facilityMeterSummaryDataSub.unsubscribe();
  }
}

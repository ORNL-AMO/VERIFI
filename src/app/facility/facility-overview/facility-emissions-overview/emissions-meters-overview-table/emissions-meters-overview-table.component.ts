import { Component, OnInit } from '@angular/core';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { FacilityOverviewService } from '../../facility-overview.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-emissions-meters-overview-table',
  templateUrl: './emissions-meters-overview-table.component.html',
  styleUrls: ['./emissions-meters-overview-table.component.css']
})
export class EmissionsMetersOverviewTableComponent implements OnInit {
  facilityMeterSummaryData: FacilityMeterSummaryData;
  facilityMeterSummaryDataSub: Subscription;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  constructor(
    private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    
    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    });
    this.facilityMeterSummaryDataSub = this.facilityOverviewService.energyMeterSummaryData.subscribe(val => {
      this.facilityMeterSummaryData = val;
    });
  }

  ngOnDestroy() {
    this.emissionsDisplaySub.unsubscribe();
    this.facilityMeterSummaryDataSub.unsubscribe();
  }
}

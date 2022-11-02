import { Component, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { FacilityOverviewService } from '../../facility-overview.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-water-meters-overview-table',
  templateUrl: './water-meters-overview-table.component.html',
  styleUrls: ['./water-meters-overview-table.component.css']
})
export class WaterMetersOverviewTableComponent implements OnInit {

  facilityMeterSummaryData: FacilityMeterSummaryData;
  facilityMeterSummaryDataSub: Subscription;
  selectedFacilitySub: Subscription;
  
  facilityVolumeLiquidUnit: string;
  constructor(
    private facilityDbService: FacilitydbService,
    private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      if (val) {
        this.facilityVolumeLiquidUnit = val.volumeLiquidUnit;
      }
    });

    this.facilityMeterSummaryDataSub = this.facilityOverviewService.waterMeterSummaryData.subscribe(val => {
      this.facilityMeterSummaryData = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityMeterSummaryDataSub.unsubscribe();
  }


}

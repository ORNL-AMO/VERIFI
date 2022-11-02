import { Component, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { FacilityOverviewService } from '../../facility-overview.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-energy-meters-overview-table',
  templateUrl: './energy-meters-overview-table.component.html',
  styleUrls: ['./energy-meters-overview-table.component.css']
})
export class EnergyMetersOverviewTableComponent implements OnInit {

  facilityMeterSummaryData: FacilityMeterSummaryData;
  facilityMeterSummaryDataSub: Subscription;
  selectedFacilitySub: Subscription;
  
  facilityEnergyUnit: string;
  constructor(
    private facilityDbService: FacilitydbService,
    private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      if (val) {
        this.facilityEnergyUnit = val.energyUnit;
      }
    });

    this.facilityMeterSummaryDataSub = this.facilityOverviewService.energyMeterSummaryData.subscribe(val => {
      this.facilityMeterSummaryData = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityMeterSummaryDataSub.unsubscribe();
  }


}

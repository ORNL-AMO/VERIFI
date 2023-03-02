import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { FacilityOverviewService } from './facility-overview.service';

@Component({
  selector: 'app-facility-overview',
  templateUrl: './facility-overview.component.html',
  styleUrls: ['./facility-overview.component.css']
})
export class FacilityOverviewComponent implements OnInit {

  facilitySub: Subscription;
  worker: Worker;
  noUtilityData: boolean;
  facility: IdbFacility;
  dateRange: { startDate: Date, endDate: Date };
  dateRangeSub: Subscription;
  constructor(private facilityDbService: FacilitydbService,
    private facilityOverviewService: FacilityOverviewService,
    private router: Router) { }

  ngOnInit(): void {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.facilityOverviewService.setCalanderizedMeters();
      if (this.facilityOverviewService.calanderizedMeters.length != 0) {
        this.noUtilityData = false;
        if (this.dateRange) {
          this.calculateFacilitiesSummary();
        }
      } else {
        this.noUtilityData = true;
      }
    });

    this.dateRangeSub = this.facilityOverviewService.dateRange.subscribe(dateRange => {
      this.dateRange = dateRange;
      if (this.dateRange) {
        this.calculateFacilitiesSummary();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
    this.facilityOverviewService.facilityOverviewData.next(undefined);
    this.facilityOverviewService.utilityUseAndCost.next(undefined);
  }

  calculateFacilitiesSummary() {
    console.log('calc');
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.facilityOverviewService.facilityOverviewData.next(data.facilityOverviewData);
        this.facilityOverviewService.utilityUseAndCost.next(data.utilityUseAndCost);
        this.facilityOverviewService.calculatingFacilityOverviewData.next(false);
        this.worker.terminate();

      };
      if (this.facilityOverviewService.utilityUseAndCost.getValue() == undefined) {
        this.facilityOverviewService.calculatingFacilityOverviewData.next(true);
      }
      this.worker.postMessage({
        calanderizedMeters: this.facilityOverviewService.calanderizedMeters,
        type: 'overview',
        dateRange: this.dateRange,
        facility: this.facility
      });
    } else {
      // Web Workers are not supported in this environment.
      if (this.facilityOverviewService.utilityUseAndCost.getValue() == undefined) {
        this.facilityOverviewService.calculatingFacilityOverviewData.next(true);
      }
      let facilityOverviewData: FacilityOverviewData = new FacilityOverviewData(this.facilityOverviewService.calanderizedMeters, this.dateRange, this.facility);
      let utilityUseAndCost: UtilityUseAndCost = new UtilityUseAndCost(this.facilityOverviewService.calanderizedMeters, this.dateRange);
      this.facilityOverviewService.facilityOverviewData.next(facilityOverviewData);
      this.facilityOverviewService.utilityUseAndCost.next(utilityUseAndCost);
      this.facilityOverviewService.calculatingFacilityOverviewData.next(false);

    }
  }

  addUtilityData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility');
  }
}

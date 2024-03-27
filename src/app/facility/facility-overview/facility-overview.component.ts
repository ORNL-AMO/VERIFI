import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbCustomFuel, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { FacilityOverviewService } from './facility-overview.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import * as _ from 'lodash';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';

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
  customFuels: Array<IdbCustomFuel>;
  constructor(private facilityDbService: FacilitydbService,
    private facilityOverviewService: FacilityOverviewService,
    private router: Router,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private eGridService: EGridService,
    private customFuelsDbService: CustomFuelDbService) { }

  ngOnInit(): void {
    this.customFuels = this.customFuelsDbService.accountCustomFuels.getValue();
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      if (this.facility && this.facility.guid != val.guid) {
        this.dateRange = undefined;
      }
      this.facility = val;
      let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue()
      if (facilityMeterData.length != 0) {
        this.noUtilityData = false;
        this.calculateFacilitiesSummary();
      } else {
        this.noUtilityData = true;
      }
    });

    this.dateRangeSub = this.facilityOverviewService.dateRange.subscribe(dateRange => {
      let needUpdatedSummary: boolean = true;
      if (!this.dateRange) {
        needUpdatedSummary = false;
      }
      this.dateRange = dateRange;
      if (needUpdatedSummary) {
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
    this.facilityOverviewService.dateRange.next(undefined);
  }

  calculateFacilitiesSummary() {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityOverviewService.facilityOverviewData.next(data.facilityOverviewData);
          this.facilityOverviewService.utilityUseAndCost.next(data.utilityUseAndCost);
          if (!this.dateRange) {
            this.facilityOverviewService.dateRange.next(data.dateRange);
          }
          this.facilityOverviewService.calculating.next(false);
        } else {
          this.facilityOverviewService.facilityOverviewData.next(undefined);
          this.facilityOverviewService.utilityUseAndCost.next(undefined);
          this.facilityOverviewService.calculating.next("error");
        }
        this.worker.terminate();

      };
      if (this.facilityOverviewService.utilityUseAndCost.getValue() == undefined) {
        this.facilityOverviewService.calculating.next(true);
      }
      this.worker.postMessage({
        type: 'overview',
        dateRange: this.dateRange,
        facility: this.facility,
        inOverview: false,
        energyIsSource: this.facility.energyIsSource,
        meterData: meterData,
        meters: meters,
        co2Emissions: this.eGridService.co2Emissions,
        customFuels: this.customFuels
      });
    } else {
      // Web Workers are not supported in this environment.
      if (this.facilityOverviewService.utilityUseAndCost.getValue() == undefined) {
        this.facilityOverviewService.calculating.next(true);
      }
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, this.facility, false, undefined, this.eGridService.co2Emissions, this.customFuels, [this.facility]);
      let facilityOverviewData: FacilityOverviewData = new FacilityOverviewData(calanderizedMeters, this.dateRange, this.facility);
      let utilityUseAndCost: UtilityUseAndCost = new UtilityUseAndCost(calanderizedMeters, this.dateRange);
      this.facilityOverviewService.facilityOverviewData.next(facilityOverviewData);
      this.facilityOverviewService.utilityUseAndCost.next(utilityUseAndCost);
      this.facilityOverviewService.calculating.next(false);
    }
  }

  addUtilityData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility');
  }
}

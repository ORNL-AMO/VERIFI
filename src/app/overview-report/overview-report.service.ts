import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class OverviewReportService {

  showReportMenu: BehaviorSubject<boolean>;
  reportOptions: BehaviorSubject<ReportOptions>;
  reportUtilityOptions: BehaviorSubject<ReportUtilityOptions>;
  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService) {
    this.showReportMenu = new BehaviorSubject<boolean>(false);
    this.reportOptions = new BehaviorSubject<ReportOptions>(undefined);
    this.reportUtilityOptions = new BehaviorSubject<ReportUtilityOptions>(undefined);
  }

  initializeOptions() {
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    accountFacilites.forEach(facility => {
      facility.selected = true;
    });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let electricity: boolean = false;
    let naturalGas: boolean = false;
    let otherFuels: boolean = false;
    let otherEnergy: boolean = false;
    let water: boolean = false;
    let wasteWater: boolean = false;
    let otherUtility: boolean = false;
    accountMeters.forEach(meter => {
      if (meter.source == 'Electricity') {
        electricity = true;
      } else if (meter.source == 'Natural Gas') {
        naturalGas = true;
      } else if (meter.source == 'Other Energy') {
        otherEnergy = true;
      } else if (meter.source == 'Other Fuels') {
        otherFuels = true;
      } else if (meter.source == 'Other Utility') {
        otherUtility = true;
      } else if (meter.source == 'Waste Water') {
        wasteWater = true;
      } else if (meter.source == 'Water') {
        water = true;
      }
    })

    this.reportOptions.next({
      title: 'Energy Consumption Report',
      notes: '',
      includeAccount: false,
      includeFacilities: true,
      facilities: accountFacilites,
      facilityMetersTable: true,
      facilityUtilityUsageTable: true,
      facilityInfo: true,
      facilityBarCharts: true
    });
    this.reportUtilityOptions.next({
      electricity: electricity,
      naturalGas: naturalGas,
      otherFuels: otherFuels,
      otherEnergy: otherEnergy,
      water: water,
      wasteWater: wasteWater,
      otherUtility: otherUtility
    })
  }
}


export interface ReportOptions {
  title: string,
  notes: string,
  includeAccount: boolean,
  includeFacilities: boolean,
  facilities: Array<IdbFacility>,
  facilityMetersTable: boolean,
  facilityUtilityUsageTable: boolean,
  facilityInfo: boolean,
  facilityBarCharts: boolean
}

export interface ReportUtilityOptions {
  electricity: boolean,
  naturalGas: boolean,
  otherFuels: boolean,
  otherEnergy: boolean,
  water: boolean,
  wasteWater: boolean,
  otherUtility: boolean,
}
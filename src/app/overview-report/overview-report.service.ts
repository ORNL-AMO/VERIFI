import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbFacility } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class OverviewReportService {

  showReportMenu: BehaviorSubject<boolean>;
  reportOptions: BehaviorSubject<ReportOptions>;
  constructor(private facilityDbService: FacilitydbService) {
    this.showReportMenu = new BehaviorSubject<boolean>(false);
    this.reportOptions = new BehaviorSubject<ReportOptions>(undefined);
  }

  initializeOptions() {
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    accountFacilites.forEach(facility => {
      facility.selected = true;
    });
    this.reportOptions.next({
      title: 'Energy Consumption Report',
      notes: '',
      includeAccount: true,
      includeFacilities: true,
      facilities: accountFacilites
    });
  }
}


export interface ReportOptions {
  title: string,
  notes: string,
  includeAccount: boolean,
  includeFacilities: boolean,
  facilities: Array<IdbFacility>
}
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { DashboardService, FacilitySummary } from '../../dashboard.service';
@Component({
  selector: 'app-facilities-table',
  templateUrl: './facilities-table.component.html',
  styleUrls: ['./facilities-table.component.css', '../../dashboard.component.css']
})
export class FacilitiesTableComponent implements OnInit {

  accountFacilities: Array<IdbFacility>;
  accountFacilitiesSub: Subscription;
  facilitiesSummary: Array<FacilitySummary>;
  totalEnergyUsage: number;
  totalEnergyCost: number;
  totalMeters: number;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService,
    private router: Router, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.facilitiesSummary = this.dashboardService.getAccountFacilitesSummary();
      this.totalEnergyUsage = _.sumBy(this.facilitiesSummary, 'energyUsage');
      this.totalMeters = _.sumBy(this.facilitiesSummary, 'numberOfMeters');
      this.totalEnergyCost = _.sumBy(this.facilitiesSummary, 'energyCost');
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSub.unsubscribe();
  }


  selectFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigateByUrl('/facility-summary');
  }
}

import { Component, OnInit } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { NavigationEnd, Router } from '@angular/router';
import { FacilityOverviewService } from '../facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';

@Component({
  selector: 'app-facility-overview-banner',
  templateUrl: './facility-overview-banner.component.html',
  styleUrls: ['./facility-overview-banner.component.css']
})
export class FacilityOverviewBannerComponent implements OnInit {

  modalOpenSub: Subscription;
  modalOpen: boolean;
  routerSub: Subscription;
  urlDisplay: 'energy' | 'emissions' | 'other';
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  showWater: boolean;
  constructor(private sharedDataService: SharedDataService, private facilityDbService: FacilitydbService,
    private router: Router,
    private facilityOverviewService: FacilityOverviewService,
    private dbChangesService: DbChangesService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.setShowWater();
    });

    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    })

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setUrlString(this.router.url);
      }
    });
    this.setUrlString(this.router.url);
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.routerSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  setUrlString(url: string) {
    if (url.includes('energy')) {
      this.urlDisplay = 'energy';
    } else if (url.includes('emissions')) {
      this.urlDisplay = 'emissions';
    } else {
      this.urlDisplay = 'other';
    }
  }


  async setEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedFacility.energyIsSource != energyIsSource) {
      this.selectedFacility.energyIsSource = energyIsSource;
      await this.dbChangesService.updateFacilities(this.selectedFacility);
    }
  }


  setEmissions(display: 'market' | 'location') {
    this.facilityOverviewService.emissionsDisplay.next(display);
  }

  setShowWater() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water' || meter.source == 'Waste Water' });
    this.showWater = waterMeter != undefined;
  }
}

import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-banner',
  templateUrl: './facility-banner.component.html',
  styleUrls: ['./facility-banner.component.css']
})
export class FacilityBannerComponent implements OnInit {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  facilityMeterData: Array<IdbUtilityMeterData>;
  facilityMeterDataSub: Subscription;

  constructor(private facilityDbService: FacilitydbService,
    private helpPanelService: HelpPanelService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });

    this.facilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.facilityMeterData = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityMeterDataSub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

}

import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-banner',
  templateUrl: './facility-banner.component.html',
  styleUrls: ['./facility-banner.component.css']
})
export class FacilityBannerComponent implements OnInit {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  constructor(private facilityDbService: FacilitydbService,
    private helpPanelService: HelpPanelService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

}

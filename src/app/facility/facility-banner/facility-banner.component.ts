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
  label: string;
  bannerColor: string;
  constructor(private facilityDbService: FacilitydbService, private router: Router,
    private helpPanelService: HelpPanelService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      if (this.selectedFacility && this.selectedFacility.color) {
        this.bannerColor = this.selectedFacility.color;
      } else {
        this.bannerColor = '#145A32';
      }
    });
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setLabel(this.router.url);
      }
    });
    this.setLabel(this.router.url);
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }


  setLabel(url: string) {
    if (this.selectedFacility) {
      if (url.includes('settings')) {
        this.label = this.selectedFacility.name + ' Settings'
      } else if (url.includes('home')) {
        this.label = this.selectedFacility.name + ' Overview'
      }
    }
  }
}

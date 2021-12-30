import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { HelpPanelService } from './help-panel.service';

@Component({
  selector: 'app-help-panel',
  templateUrl: './help-panel.component.html',
  styleUrls: ['./help-panel.component.css']
})
export class HelpPanelComponent implements OnInit {

  helpText: string;
  selectedSource: string;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  selectedFacilityName: string = 'Facility';
  helpPanelOpen: boolean;
  constructor(
    private router: Router,
    private facilityDbService: FacilitydbService,
    private helpPanelService: HelpPanelService
  ) {
    router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        this.getUrl(val.url);
      }
    });
  }

  ngOnInit() {
    this.helpPanelService.helpPanelOpen.subscribe(helpPanelOpen => {
      this.helpPanelOpen = helpPanelOpen
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100)
    });

    this.getUrl(this.router.url);

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.selectedFacilityName = val.name;
    })
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  save() {
    this.facilityDbService.update(this.selectedFacility);
  }

  getUrl(val: string) {
    this.helpText = val.replace('/utility/', '');
    this.selectedSource = this.helpText.split('energy-consumption/')[1];
  }

  closePanel(){
    this.helpPanelService.helpPanelOpen.next(false);
  }

}

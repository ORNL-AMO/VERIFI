import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-help-panel',
  templateUrl: './help-panel.component.html',
  styleUrls: ['./help-panel.component.css']
})
export class HelpPanelComponent implements OnInit {

  helpText: string;
  selectedSource: string;
  selectedFacilitySub: Subscription;
  selectedFacilityName: string = 'Facility';
  
  constructor(
    private router: Router,
    private facilityDbService: FacilitydbService,
    ) { 
    router.events.subscribe((route) => {
      if (route instanceof NavigationEnd) {
        this.helpText = route.url.replace('/utility/','');
        this.selectedSource = this.helpText.split('energy-consumption/')[1];
      }
    });
  }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      if (facility) {
        this.selectedFacilityName = facility.name;
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

}

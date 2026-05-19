import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-setup-options',
  standalone: false,
  templateUrl: './facility-energy-uses-setup-options.component.html',
  styleUrl: './facility-energy-uses-setup-options.component.css',
})
export class FacilityEnergyUsesSetupOptionsComponent {

  facility: IdbFacility;
  facilitySub: Subscription;
  facilityEnergyUseGroupsSub: Subscription;
  hasChildRoute: boolean;
  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setHasChildRoute();
      }
    });
    this.setHasChildRoute();

    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.facilityEnergyUseGroupsSub = this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.subscribe(groups => {
      if (groups && groups.length == 0 && !this.hasChildRoute) {
        this.setupNewGroups();
      }
    });


  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.facilityEnergyUseGroupsSub.unsubscribe();
  }

  setHasChildRoute() {
    this.hasChildRoute = this.route.firstChild != null;
  }
  
  leaveGroupSetup() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  setupNewGroups() {
    this.router.navigate(['./new-groups'], { relativeTo: this.route });
  }

  editExistingGroups() {
    this.router.navigate(['./edit-groups'], { relativeTo: this.route });
  }

  addYearOfData() {
    this.router.navigate(['./add-year'], { relativeTo: this.route });
  }
}

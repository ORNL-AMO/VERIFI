import { Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitiesListComponent } from 'src/app/data-management/account-facilities/facilities-list/facilities-list.component';
import { FacilityDataComponent } from 'src/app/data-management/account-facilities/facility-data/facility-data.component';
import { FacilityMeterMonthlyDataComponent } from 'src/app/data-management/account-facilities/facility-data/facility-meters/facility-meter-monthly-data/facility-meter-monthly-data.component';
import { FacilityMeterComponent } from 'src/app/data-management/account-facilities/facility-data/facility-meters/facility-meter/facility-meter.component';
import { FacilitySetupComponent } from 'src/app/data-management/account-facilities/facility-data/facility-setup/facility-setup.component';
import { MeterDataComponent } from 'src/app/shared/shared-meter-content/meter-data/meter-data.component';

@Component({
  selector: 'app-data-management-facility-help',
  standalone: false,
  templateUrl: './data-management-facility-help.component.html',
  styleUrl: './data-management-facility-help.component.css'
})
export class DataManagementFacilityHelpComponent {

  helpContext: string = 'default';
  routerSub: Subscription;
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
  }

  ngOnInit() {
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setHelpURL();
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setHelpURL();
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }


  setHelpURL() {
    let parentRoute: ActivatedRoute = this.activatedRoute.firstChild;
    let childRoute: ActivatedRoute = parentRoute.firstChild;
    let currentComponent = childRoute.component.name;
    if (currentComponent === 'FacilitiesListComponent') {
      this.helpContext = 'facilities-list'
    } else if (currentComponent === 'FacilityDataComponent') {
      if (childRoute.firstChild) {
        let subComponent = childRoute.firstChild.component.name;
        console.log(subComponent);
        if (subComponent === 'FacilitySetupComponent') {
          this.helpContext = 'facility-setup';
        } else if (subComponent === 'FacilityMeterComponent') {
          this.helpContext = 'facility-setup';
        } else if (subComponent === 'MeterDataComponent') {
          //todo child routes
          console.log('METER DATA COMPONENT');


        } else if (subComponent === 'FacilityMeterMonthlyDataComponent') {
          this.helpContext = 'facility-setup';
        }
      }
    } else {
      this.helpContext = 'default';
    }
  }
}

import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
        if (childRoute.firstChild.component) {
          let subComponent = childRoute.firstChild.component.name;
          if (subComponent === 'FacilitySetupComponent') {
            this.helpContext = 'facility-setup';
          } else if (subComponent === 'FacilityMeterComponent') {
            this.helpContext = 'facility-setup';
          } else if (subComponent === 'FacilityMeterMonthlyDataComponent') {
            this.helpContext = 'facility-setup';
          } else if (subComponent === 'FacilityMetersTableComponent') {
            this.helpContext = 'facility-meters'
          } else if (subComponent === 'SetMeterGroupingComponent') {
            this.helpContext = 'facility-meter-grouping'
          } else if (subComponent === 'FacilityPredictorsTableComponent') {
            this.helpContext = 'facility-predictors';
          }
        } else {
          if (childRoute.firstChild.firstChild && childRoute.firstChild.firstChild.component) {
            let subComponent = childRoute.firstChild.firstChild.component.name;
            if (subComponent === 'MeterDataComponent') {
              this.helpContext = 'facility-meter-data';
            } else if (subComponent === 'FacilityMeterComponent') {
              this.helpContext = 'facility-meter-settings';
            } else if (subComponent === 'FacilityMeterMonthlyDataComponent') {
              this.helpContext = 'facility-meter-monthly-data';
            } else if (subComponent === 'FacilityPredictorComponent') {
              this.helpContext = 'facility-predictors';
            }
          } else {
            if (this.router.url.includes('predictor-data')) {
              this.helpContext = 'facility-predictors';
            }
          }
        }
      }
    } else {
      this.helpContext = 'default';
    }
  }
}

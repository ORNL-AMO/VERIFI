import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitiesListComponent } from 'src/app/data-management/account-facilities/facilities-list/facilities-list.component';
import { FacilityDataComponent } from 'src/app/data-management/account-facilities/facility-data/facility-data.component';
import { FacilityMeterDataQualityReportComponent } from 'src/app/data-management/account-facilities/facility-data/facility-meters/facility-meter-data-quality-report/facility-meter-data-quality-report.component';
import { FacilityMeterMonthlyDataComponent } from 'src/app/data-management/account-facilities/facility-data/facility-meters/facility-meter-monthly-data/facility-meter-monthly-data.component';
import { FacilityMeterComponent } from 'src/app/data-management/account-facilities/facility-data/facility-meters/facility-meter/facility-meter.component';
import { FacilityMetersTableComponent } from 'src/app/data-management/account-facilities/facility-data/facility-meters/facility-meters-table/facility-meters-table.component';
import { FacilityPredictorDataQualityReportComponent } from 'src/app/data-management/account-facilities/facility-data/facility-predictors/facility-predictor-data-quality-report/facility-predictor-data-quality-report.component';
import { FacilityPredictorComponent } from 'src/app/data-management/account-facilities/facility-data/facility-predictors/facility-predictor/facility-predictor.component';
import { FacilityPredictorsTableComponent } from 'src/app/data-management/account-facilities/facility-data/facility-predictors/facility-predictors-table/facility-predictors-table.component';
import { FacilitySetupComponent } from 'src/app/data-management/account-facilities/facility-data/facility-setup/facility-setup.component';
import { MeterDataComponent } from 'src/app/shared/shared-meter-content/meter-data/meter-data.component';
import { SetMeterGroupingComponent } from 'src/app/shared/shared-meter-content/set-meter-grouping/set-meter-grouping.component';

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
    if (!parentRoute) {
      return;
    }
    let childRoute: ActivatedRoute = parentRoute.firstChild;
    if (!childRoute) {
      return;
    }
    let currentComponent = childRoute.snapshot.routeConfig?.component;
    if (currentComponent === FacilitiesListComponent) {
      this.helpContext = 'facilities-list'
    } else if (currentComponent === FacilityDataComponent) {
      if (childRoute.firstChild) {
        if (childRoute.firstChild.component) {
          let subComponent = childRoute.firstChild.routeConfig?.component;
          if (subComponent === FacilitySetupComponent) {
            this.helpContext = 'facility-setup';
          } else if (subComponent === FacilityMeterComponent) {
            this.helpContext = 'facility-setup';
          } else if (subComponent === FacilityMeterMonthlyDataComponent) {
            this.helpContext = 'facility-setup';
          } else if (subComponent === FacilityMetersTableComponent) {
            this.helpContext = 'facility-meters'
          } else if (subComponent === SetMeterGroupingComponent) {
            this.helpContext = 'facility-meter-grouping'
          } else if (subComponent === FacilityPredictorsTableComponent) {
            this.helpContext = 'facility-predictors';
          }
        } else {
          if (childRoute.firstChild.firstChild && childRoute.firstChild.firstChild.routeConfig?.component) {
            let subComponent = childRoute.firstChild.firstChild.routeConfig?.component;
            if (subComponent === MeterDataComponent) {
              this.helpContext = 'facility-meter-data';
            } else if (subComponent === FacilityMeterComponent) {
              this.helpContext = 'facility-meter-settings';
            } else if (subComponent === FacilityMeterMonthlyDataComponent) {
              this.helpContext = 'facility-meter-monthly-data';
            } else if (subComponent === FacilityPredictorComponent) {
              this.helpContext = 'facility-predictors';
            } else if(subComponent === FacilityMeterDataQualityReportComponent){
              this.helpContext = 'facility-meter-data-quality';
            } else if(subComponent === FacilityPredictorDataQualityReportComponent){
              this.helpContext = 'facility-predictor-data-quality';
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

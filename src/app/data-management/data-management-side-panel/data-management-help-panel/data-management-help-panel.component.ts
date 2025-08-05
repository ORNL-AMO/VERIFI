import { Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataManagementHomeComponent } from '../../data-management-home/data-management-home.component';
import { AccountSetupComponent } from '../../account-setup/account-setup.component';
import { DataManagementImportComponent } from '../../data-management-import/data-management-import.component';
import { AccountFacilitiesComponent } from '../../account-facilities/account-facilities.component';
import { WeatherDataComponent } from 'src/app/weather-data/weather-data.component';
import { AccountCustomDataComponent } from '../../account-custom-data/account-custom-data.component';

@Component({
  selector: 'app-data-management-help-panel',
  standalone: false,
  templateUrl: './data-management-help-panel.component.html',
  styleUrl: './data-management-help-panel.component.css'
})
export class DataManagementHelpPanelComponent {

  helpContext: 'todo-list' | 'account-setup' | 'upload' | 'facility' | 'weather-data' | 'account-custom-data' | 'default' = 'default';
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
    let currentComponent = this.activatedRoute.firstChild.snapshot.routeConfig?.component;
    if (currentComponent === DataManagementHomeComponent) {
      this.helpContext = 'todo-list'
    } else if (currentComponent === AccountSetupComponent) {
      this.helpContext = 'account-setup';
    } else if (currentComponent === DataManagementImportComponent) {
      this.helpContext = 'upload';
    } else if (currentComponent === AccountFacilitiesComponent) {
      this.helpContext = 'facility';
    } else if (currentComponent === WeatherDataComponent) {
      this.helpContext = 'weather-data';
    } else if (currentComponent === AccountCustomDataComponent) {
      this.helpContext = 'account-custom-data';
    } else {
      this.helpContext = 'default';
    }
  }
}

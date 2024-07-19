import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataWizardComponent } from './data-wizard.component';
import { DataWizardSidebarComponent } from './data-wizard-sidebar/data-wizard-sidebar.component';
import { RouterModule } from '@angular/router';
import { AccountSetupComponent } from './account-setup/account-setup.component';
import { AccountFacilitiesComponent } from './account-facilities/account-facilities.component';
import { FacilityDataComponent } from './facility-data/facility-data.component';
import { FacilitySetupComponent } from './facility-data/facility-setup/facility-setup.component';



@NgModule({
  declarations: [  
    DataWizardComponent, 
    DataWizardSidebarComponent, AccountSetupComponent, AccountFacilitiesComponent, FacilityDataComponent, FacilitySetupComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class DataWizardModule { }

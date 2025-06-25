import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomDatabaseComponent } from './custom-database.component';
import { RegionalEmissionsDataComponent } from './regional-emissions-data/regional-emissions-data.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';
import { EmissionsDataFormComponent } from './regional-emissions-data/emissions-data-form/emissions-data-form.component';
import { EmissionsDataDashboardComponent } from './regional-emissions-data/emissions-data-dashboard/emissions-data-dashboard.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomFuelDataComponent } from './custom-fuel-data/custom-fuel-data.component';
import { CustomFuelDataDashboardComponent } from './custom-fuel-data/custom-fuel-data-dashboard/custom-fuel-data-dashboard.component';
import { CustomFuelDataFormComponent } from './custom-fuel-data/custom-fuel-data-form/custom-fuel-data-form.component';
import { ExistingFuelsModalComponent } from './custom-fuel-data/custom-fuel-data-form/existing-fuels-modal/existing-fuels-modal.component';
import { CustomGWPComponent } from './custom-gwp/custom-gwp.component';
import { CustomGwpDashboardComponent } from './custom-gwp/custom-gwp-dashboard/custom-gwp-dashboard.component';
import { CustomGwpFormComponent } from './custom-gwp/custom-gwp-form/custom-gwp-form.component';
import { ExistingGwpsModalComponent } from './custom-gwp/custom-gwp-form/existing-gwps-modal/existing-gwps-modal.component';



@NgModule({
  declarations: [
    CustomDatabaseComponent,
    RegionalEmissionsDataComponent,
    EmissionsDataFormComponent,
    EmissionsDataDashboardComponent,
    CustomFuelDataComponent,
    CustomFuelDataDashboardComponent,
    CustomFuelDataFormComponent,
    ExistingFuelsModalComponent,
    CustomGWPComponent,
    CustomGwpDashboardComponent,
    CustomGwpFormComponent,
    ExistingGwpsModalComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class CustomDatabaseModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomDatabaseComponent } from './custom-database.component';
import { RegionalEmissionsDataComponent } from './regional-emissions-data/regional-emissions-data.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { EmissionsDataFormComponent } from './regional-emissions-data/emissions-data-form/emissions-data-form.component';
import { EmissionsDataDashboardComponent } from './regional-emissions-data/emissions-data-dashboard/emissions-data-dashboard.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    CustomDatabaseComponent,
    RegionalEmissionsDataComponent,
    EmissionsDataFormComponent,
    EmissionsDataDashboardComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    FormsModule
  ]
})
export class CustomDatabaseModule { }

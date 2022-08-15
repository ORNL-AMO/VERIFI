import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomDatabaseComponent } from './custom-database.component';
import { RegionalEmissionsDataComponent } from './regional-emissions-data/regional-emissions-data.component';
import { RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    CustomDatabaseComponent,
    RegionalEmissionsDataComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class CustomDatabaseModule { }

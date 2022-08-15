import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomDatabaseComponent } from './custom-database.component';
import { RegionalEmissionsDataComponent } from './regional-emissions-data/regional-emissions-data.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';



@NgModule({
  declarations: [
    CustomDatabaseComponent,
    RegionalEmissionsDataComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule
  ]
})
export class CustomDatabaseModule { }

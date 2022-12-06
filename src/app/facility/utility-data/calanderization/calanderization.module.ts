import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalanderizationChartComponent } from './calanderization-chart/calanderization-chart.component';
import { CalanderizationFilterComponent } from './calanderization-filter/calanderization-filter.component';
import { DataApplicationMenuComponent } from './data-application-menu/data-application-menu.component';
import { CalanderizationComponent } from './calanderization.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbDatepickerModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { CalanderizedMeterDataTableComponent } from './calanderized-meter-data-table/calanderized-meter-data-table.component';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';



@NgModule({
  declarations: [
    CalanderizationChartComponent,
    CalanderizationFilterComponent,
    DataApplicationMenuComponent,
    CalanderizationComponent,
    CalanderizedMeterDataTableComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    HelperPipesModule,
    NgbPaginationModule,
    TableItemsDropdownModule
  ]
})
export class CalanderizationModule { }

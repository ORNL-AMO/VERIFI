import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalanderizationChartComponent } from './calanderization-chart/calanderization-chart.component';
import { CalanderizationFilterComponent } from './calanderization-filter/calanderization-filter.component';
import { DataApplicationMenuComponent } from './data-application-menu/data-application-menu.component';
import { CalanderizationComponent } from './calanderization.component';



@NgModule({
  declarations: [
    CalanderizationChartComponent,
    CalanderizationFilterComponent,
    DataApplicationMenuComponent,
    CalanderizationComponent
  ],
  imports: [
    CommonModule
  ]
})
export class CalanderizationModule { }

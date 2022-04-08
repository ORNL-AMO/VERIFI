import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalanderizationChartComponent } from './calanderization-chart/calanderization-chart.component';
import { CalanderizationFilterComponent } from './calanderization-filter/calanderization-filter.component';
import { DataApplicationMenuComponent } from './data-application-menu/data-application-menu.component';
import { CalanderizationComponent } from './calanderization.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbDatepickerModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';



@NgModule({
  declarations: [
    CalanderizationChartComponent,
    CalanderizationFilterComponent,
    DataApplicationMenuComponent,
    CalanderizationComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    HelperPipesModule,
    NgbPaginationModule
  ]
})
export class CalanderizationModule { }

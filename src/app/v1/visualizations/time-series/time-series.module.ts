import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { TimeSeriesChartComponent } from './chart/time-series-chart.component';

@NgModule({ declarations: [TimeSeriesChartComponent],
  imports: [CommonModule, EChartsChartDirective], exports: [TimeSeriesChartComponent] })
export class TimeSeriesModule { }

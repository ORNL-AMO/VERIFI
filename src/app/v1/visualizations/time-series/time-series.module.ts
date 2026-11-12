import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { TimeSeriesChartComponent } from './chart/time-series-chart.component';
import { ChartSettingsComponent } from './settings/chart-settings.component';

@NgModule({ declarations: [TimeSeriesChartComponent, ChartSettingsComponent],
  imports: [CommonModule, ReactiveFormsModule, EChartsChartDirective], exports: [TimeSeriesChartComponent, ChartSettingsComponent] })
export class TimeSeriesModule { }

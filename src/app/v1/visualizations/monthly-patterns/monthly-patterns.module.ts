import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { MonthlyPatternsChartComponent } from './chart/monthly-patterns-chart.component';
import { MonthlyPatternYearSettingsComponent } from './year-settings/monthly-pattern-year-settings.component';

@NgModule({ declarations: [MonthlyPatternsChartComponent, MonthlyPatternYearSettingsComponent], imports: [CommonModule, ReactiveFormsModule, EChartsChartDirective], exports: [MonthlyPatternsChartComponent, MonthlyPatternYearSettingsComponent] })
export class MonthlyPatternsModule { }

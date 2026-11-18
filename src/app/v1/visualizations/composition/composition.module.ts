import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { CompositionChartComponent } from './chart/composition-chart.component';
import { CompositionSettingsComponent } from './settings/composition-settings.component';

@NgModule({ declarations: [CompositionChartComponent, CompositionSettingsComponent],
  imports: [CommonModule, ReactiveFormsModule, EChartsChartDirective], exports: [CompositionSettingsComponent] })
export class CompositionModule { }

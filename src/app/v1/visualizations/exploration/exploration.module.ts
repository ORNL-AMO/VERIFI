import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { ExplorationChartComponent } from './chart/exploration-chart.component';
import { PairPanelComponent } from './pair-panel/pair-panel.component';
import { ExplorationSettingsComponent } from './settings/exploration-settings.component';

@NgModule({ declarations: [ExplorationChartComponent, PairPanelComponent, ExplorationSettingsComponent], imports: [CommonModule, ReactiveFormsModule, EChartsChartDirective], exports: [ExplorationSettingsComponent] })
export class ExplorationModule { }

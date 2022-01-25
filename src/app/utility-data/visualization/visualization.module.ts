import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CorrelationHeatmapComponent } from './correlation-heatmap/correlation-heatmap.component';
import { CorrelationMenuComponent } from './correlation-menu/correlation-menu.component';
import { CorrelationPlotComponent } from './correlation-plot/correlation-plot.component';
import { TimeSeriesComponent } from './time-series/time-series.component';
import { VisualizationComponent } from './visualization.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    CorrelationHeatmapComponent,
    CorrelationMenuComponent,
    CorrelationPlotComponent,
    TimeSeriesComponent,
    VisualizationComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class VisualizationModule { }

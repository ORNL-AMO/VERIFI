import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CorrelationHeatmapComponent } from './correlation-heatmap/correlation-heatmap.component';
import { CorrelationPlotComponent } from './correlation-plot/correlation-plot.component';
import { TimeSeriesComponent } from './time-series/time-series.component';
import { VisualizationComponent } from './visualization.component';
import { FormsModule } from '@angular/forms';
import { VisualizationBannerComponent } from './visualization-banner/visualization-banner.component';
import { RouterModule } from '@angular/router';
import { CorrelationPlotMenuComponent } from './correlation-plot-menu/correlation-plot-menu.component';
import { CorrelationPlotGraphItemComponent } from './correlation-plot/correlation-plot-graph-item/correlation-plot-graph-item.component';



@NgModule({
  declarations: [
    CorrelationHeatmapComponent,
    CorrelationPlotComponent,
    TimeSeriesComponent,
    VisualizationComponent,
    VisualizationBannerComponent,
    CorrelationPlotMenuComponent,
    CorrelationPlotGraphItemComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ]
})
export class VisualizationModule { }

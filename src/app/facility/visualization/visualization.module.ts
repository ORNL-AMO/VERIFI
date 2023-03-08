import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CorrelationHeatmapComponent } from './correlation-heatmap/correlation-heatmap.component';
import { CorrelationMenuComponent } from './correlation-menu/correlation-menu.component';
import { CorrelationPlotComponent } from './correlation-plot/correlation-plot.component';
import { TimeSeriesComponent } from './time-series/time-series.component';
import { VisualizationComponent } from './visualization.component';
import { FormsModule } from '@angular/forms';
import { VisualizationBannerComponent } from './visualization-banner/visualization-banner.component';
import { RouterModule } from '@angular/router';
import { CorrelationPlotMenuComponent } from './correlation-plot/correlation-plot-menu/correlation-plot-menu.component';
import { CorrelationPlotGraphComponent } from './correlation-plot/correlation-plot-graph/correlation-plot-graph.component';
import { CorrelationPlotGraphItemComponent } from './correlation-plot/correlation-plot-graph/correlation-plot-graph-item/correlation-plot-graph-item.component';



@NgModule({
  declarations: [
    CorrelationHeatmapComponent,
    CorrelationMenuComponent,
    CorrelationPlotComponent,
    TimeSeriesComponent,
    VisualizationComponent,
    VisualizationBannerComponent,
    CorrelationPlotMenuComponent,
    CorrelationPlotGraphComponent,
    CorrelationPlotGraphItemComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ]
})
export class VisualizationModule { }

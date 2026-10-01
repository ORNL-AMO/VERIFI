import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CorrelationHeatmapComponent } from '@v0/data-evaluation/facility/visualization/correlation-heatmap/correlation-heatmap.component';
import { CorrelationPlotComponent } from '@v0/data-evaluation/facility/visualization/correlation-plot/correlation-plot.component';
import { TimeSeriesComponent } from '@v0/data-evaluation/facility/visualization/time-series/time-series.component';
import { VisualizationComponent } from '@v0/data-evaluation/facility/visualization/visualization.component';
import { FormsModule } from '@angular/forms';
import { VisualizationBannerComponent } from '@v0/data-evaluation/facility/visualization/visualization-banner/visualization-banner.component';
import { RouterModule } from '@angular/router';
import { CorrelationPlotMenuComponent } from '@v0/data-evaluation/facility/visualization/correlation-plot-menu/correlation-plot-menu.component';
import { CorrelationPlotGraphItemComponent } from '@v0/data-evaluation/facility/visualization/correlation-plot/correlation-plot-graph-item/correlation-plot-graph-item.component';



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

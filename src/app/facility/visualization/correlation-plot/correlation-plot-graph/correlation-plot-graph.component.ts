import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AxisOption, VisualizationStateService } from '../../visualization-state.service';

@Component({
  selector: 'app-correlation-plot-graph',
  templateUrl: './correlation-plot-graph.component.html',
  styleUrls: ['./correlation-plot-graph.component.css']
})
export class CorrelationPlotGraphComponent {

  axisCombinations: Array<{
    y: AxisOption,
    xOptions: Array<AxisOption>
  }>;
  correlationPlotOptionsSub: Subscription;
  constructor(private visualizationStateService: VisualizationStateService) { }

  ngOnInit(): void {
    this.correlationPlotOptionsSub = this.visualizationStateService.correlationPlotOptions.subscribe(correlationPlotOptions => {
      this.axisCombinations = new Array();
      let allYOptions: Array<AxisOption> = new Array();
      let allXOptions: Array<AxisOption> = new Array();
      if (correlationPlotOptions.asMeters) {
        correlationPlotOptions.xAxisMeterOptions.forEach(meterOption => {
          if (meterOption.selected) {
            allXOptions.push(meterOption);
          }
        });
        correlationPlotOptions.yAxisMeterOptions.forEach(meterOption => {
          if (meterOption.selected) {
            allYOptions.push(meterOption);
          }
        });
      } else {
        correlationPlotOptions.xAxisGroupOptions.forEach(meterOption => {
          if (meterOption.selected) {
            allXOptions.push(meterOption);
          }
        });
        correlationPlotOptions.yAxisGroupOptions.forEach(meterOption => {
          if (meterOption.selected) {
            allYOptions.push(meterOption);
          }
        });
      }
      correlationPlotOptions.xAxisPredictorOptions.forEach(predictorOption => {
        if (predictorOption.selected) {
          allXOptions.push(predictorOption);
        }
      });

      correlationPlotOptions.yAxisPredictorOptions.forEach(predictorOption => {
        if (predictorOption.selected) {
          allYOptions.push(predictorOption);
        }
      })

      allYOptions.forEach(yOption => {
        let xOptions: Array<AxisOption> = new Array();
        allXOptions.forEach(xOption => {
          if (xOption.itemId != yOption.itemId) {
            xOptions.push(xOption);
          }
        });
        this.axisCombinations.push({
          y: yOption,
          xOptions: xOptions
        })
      });
    });
  }

  ngOnDestroy() {
    this.correlationPlotOptionsSub.unsubscribe();
  }
}

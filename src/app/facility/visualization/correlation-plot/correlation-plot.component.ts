import { Component } from '@angular/core';
import { AxisOption, VisualizationStateService } from '../visualization-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-correlation-plot',
  templateUrl: './correlation-plot.component.html',
  styleUrls: ['./correlation-plot.component.css']
})
export class CorrelationPlotComponent {

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

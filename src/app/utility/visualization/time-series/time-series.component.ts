import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { PlotDataItem } from 'src/app/models/visualization';
import { VisualizationStateService } from '../visualization-state.service';

@Component({
  selector: 'app-time-series',
  templateUrl: './time-series.component.html',
  styleUrls: ['./time-series.component.css']
})
export class TimeSeriesComponent implements OnInit {

  @ViewChild('timeSeries', { static: false }) timeSeries: ElementRef;

  // regressionTableData: Array<RegressionTableDataItem>;
  plotData: Array<PlotDataItem>;
  monthNames: Array<string> = ["Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  plotDataSub: Subscription;
  // regressionTableDataSub: Subscription;
  constructor(private plotlyService: PlotlyService, private cd: ChangeDetectorRef, private visualizationStateService: VisualizationStateService) { }

  ngOnInit(): void {
    this.plotDataSub = this.visualizationStateService.plotData.subscribe(plotData => {
      this.plotData = plotData;
      this.drawChart();
    });

    // this.regressionTableDataSub = this.visualizationStateService.regressionTableData.subscribe(regressionTableData => {
    //   this.regressionTableData = regressionTableData;
    //   this.drawChart();
    // })
  }

  ngOnDestroy() {
    this.plotDataSub.unsubscribe();
    // this.regressionTableDataSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges() {
    this.drawChart();
  }

  drawChart(): void {
    if (this.timeSeries && this.plotData) {
      this.drawTimeSeries();
    }
  }

  drawTimeSeries() {
    let traceData = new Array();
    let yAxisTitle: string;
    let yAxis2Title: string;
    let hoverformat: string;
    // let tickSuffix: string;
    // let tickPrefix: string;
    let hoverformat2: string;
    // let tickSuffix2: string;
    // let tickPrefix2: string;
    // let yaxis: string = 'y';
    let offsetgroup: number = 1;
    let costLine: { width: number };
    let energyLine: { width: number };
    let y1overlay: string;
    let y2overlay: string = 'y';

    // if(this.displayGraphCost == 'scatter'){
    //   costLine = { width: 5  }
    // }

    // if(this.displayGraphEnergy == 'scatter'){
    //   energyLine = { width: 5 }

    // }

    // if(this.displayGraphEnergy == 'scatter' && this.displayGraphCost == 'bar'){
    //   y2overlay = undefined;
    //   y1overlay = 'y2';
    // }


    // if (this.displayGraphEnergy) {
    //   let yData: Array<number>;
    //   hoverformat = '$,.0f'
    //   if (this.meterData.showConsumption) {
    //     // tickSuffix = " " + this.meterData.consumptionUnit;
    //     yAxisTitle = 'Utility Consumption (' + this.meterData.consumptionUnit + ')';
    //     yData = this.meterData.monthlyData.map(data => { return data.energyConsumption })
    //   } else if (this.meterData.showEnergyUse) {
    //     // tickSuffix = " " + this.meterData.energyUnit;
    //     yAxisTitle = 'Utility Consumption (' + this.meterData.consumptionUnit + ')';
    //     yData = this.meterData.monthlyData.map(data => { return data.energyUse });
    //   }
    //   traceData.push({
    //     x: this.meterData.monthlyData.map(data => { return data.date }),
    //     y: yData,
    //     name: 'Utility Consumption',
    //     type: this.displayGraphEnergy,
    //     yaxis: yaxis,
    //     offsetgroup: offsetgroup,
    //     // marker: {
    //     //   color: this.getMarkerColor(),
    //     // },
    //     line: energyLine
    //   });
    //   yaxis = 'y2';
    //   offsetgroup = 2;
    // }


    // if (this.displayGraphCost) {
    //   if (!this.displayGraphEnergy) {
    //     // tickPrefix = "$";
    //     hoverformat = ',.0f';
    //     yAxisTitle = 'Utility Cost';
    //   } else {
    //     // tickPrefix2 = "$";
    //     hoverformat2 = ',.0f';
    //     yAxis2Title = 'Utility Cost';
    //   }
    this.plotData.forEach(dataItem => {
      let yaxis: string = 'y';
      if(dataItem.isMeter == false){
        yaxis = 'y2';
      }
      traceData.push({
        x: dataItem.valueDates.map(date => { return date }),
        y: dataItem.values.map(data => { return data }),
        name: dataItem.label,
        type: 'scatter',
        yaxis: yaxis,
        offsetgroup: offsetgroup,
        line: {width: 5}
      });
    })
    // }

    var layout = {
      height: 800,
      legend: {
        orientation: "h"
      },
      title: {
        text: 'Time Series',
        font: {
          size: 18
        },
      },
      xaxis: {
        hoverformat: "%b, %y"
      },
      yaxis: {
        title: {
          text: 'Energy Consumption',
          font: {
            size: 16
          },
          standoff: 18
        },
        hoverformat: hoverformat,
        // ticksuffix: tickSuffix,
        // tickprefix: tickPrefix,
        automargin: true,
        overlaying: y1overlay
      },
      yaxis2: {
        title: {
          text: 'Predictor Usage',
          font: {
            size: 16
          },
          standoff: 18
        },
        hoverformat: hoverformat2,
        // ticksuffix: tickSuffix2,
        // tickprefix: tickPrefix2,
        automargin: true,
        overlaying: y2overlay,
        side: 'right',
      },
      margin: { r: 0, t: 50 }
    };
    var config = { responsive: true };
    this.plotlyService.newPlot(this.timeSeries.nativeElement, traceData, layout, config);
  }
}

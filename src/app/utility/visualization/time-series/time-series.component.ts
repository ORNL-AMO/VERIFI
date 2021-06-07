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

  plotData: Array<PlotDataItem>;
  monthNames: Array<string> = ["Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  plotDataSub: Subscription;
  constructor(private plotlyService: PlotlyService, private cd: ChangeDetectorRef, private visualizationStateService: VisualizationStateService) { }

  ngOnInit(): void {
    this.plotDataSub = this.visualizationStateService.plotData.subscribe(plotData => {
      this.plotData = plotData;
      this.drawChart();
    });
  }

  ngOnDestroy() {
    this.plotDataSub.unsubscribe();
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
        line: {width: 5}
      });
    });
    var layout = {
      height: 700,
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
        automargin: true,
      },
      yaxis2: {
        title: {
          text: 'Predictor Usage',
          font: {
            size: 16
          },
          standoff: 18
        },
        automargin: true,
        side: 'right',
        overlaying: 'y'
      },
      margin: { r: 0, t: 50 }
    };
    var config = { responsive: true };
    this.plotlyService.newPlot(this.timeSeries.nativeElement, traceData, layout, config);
  }
}

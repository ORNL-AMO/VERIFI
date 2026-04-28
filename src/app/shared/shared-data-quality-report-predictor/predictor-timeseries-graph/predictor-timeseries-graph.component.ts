import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorStatistics } from '../predictorDataQualityStatistics';
import { getDateFromPredictorData } from '../../dateHelperFunctions';

@Component({
  selector: 'app-predictor-timeseries-graph',
  standalone: false,

  templateUrl: './predictor-timeseries-graph.component.html',
  styleUrl: './predictor-timeseries-graph.component.css'
})
export class PredictorTimeseriesGraphComponent {

  @Input({ required: true })
  predictorData: Array<IdbPredictorData>;
  @Input({ required: true })
  selectedPredictor: IdbPredictor;
  @Input({ required: true })
  stats: PredictorStatistics;
  @Input({ required: true })
  missingMonthsList: Array<{ monthYear: string }> = [];

  @ViewChild('predictorTimeSeriesGraph', { static: false }) predictorTimeSeriesGraph: ElementRef;
  viewInitialized: boolean = false;

  constructor(private plotlyService: PlotlyService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['predictorData'] && this.viewInitialized) {
      this.drawChart();
    }
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    if (this.predictorData) {
      this.drawChart();
    }
  }

  calculateUnit(): string {
    if (this.selectedPredictor.unit && this.selectedPredictor.predictorType != 'Weather') {
      return this.selectedPredictor.unit;
    } else if (this.selectedPredictor.predictorType == 'Weather') {
      if (this.selectedPredictor.weatherDataType == 'CDD' || this.selectedPredictor.weatherDataType == 'HDD') {
        return 'days';
      } else if (this.selectedPredictor.weatherDataType == 'dryBulbTemp') {
        return '&#8457;';
      } else if (this.selectedPredictor.weatherDataType == 'relativeHumidity') {
        return '%';
      }
    }
    return '';
  }

  drawChart() {
    let unit = this.calculateUnit();
    if (unit != null && unit != undefined && unit != '') {
      unit = '(' + unit + ')';
    }
    else {
      unit = '';
    }

    this.predictorData = this.predictorData.slice().sort((a, b) => getDateFromPredictorData(a).getTime() - getDateFromPredictorData(b).getTime());
    let markers: Array<{
      color: string,
      symbol: string,
      size: number
    }> = this.predictorData.map(data => { return this.getMarker(data.amount) });

    let markerSizes: Array<number> = markers.map(marker => marker.size);
    let markerColors: Array<string> = markers.map(marker => marker.color);
    let markerSymbols: Array<string> = markers.map(marker => marker.symbol);

    // Build vertical dashed-line shapes for each missing month
    let missingMonthShapes = (this.missingMonthsList || []).map(({ monthYear }) => {
      let date = new Date(monthYear);
      let x = new Date(date.getFullYear(), date.getMonth(), 15); // mid-month
      return {
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: x,
        x1: x,
        y0: 0,
        y1: 1,
        line: {
          color: '#f57c00',
          width: 2,
          dash: 'dot'
        }
      };
    });

    // Invisible scatter trace for missing month legend entry
    let missingMonthDates = (this.missingMonthsList || []).map(({ monthYear }) =>
      new Date(new Date(monthYear).getFullYear(), new Date(monthYear).getMonth(), 15)
    );

    var data: any[] = [
      {
        type: "scatter",
        mode: "lines+markers",
        name: 'Predictor Data',
        x: this.predictorData.map(data => { return getDateFromPredictorData(data) }),
        y: this.predictorData.map(data => { return data.amount }),
        line: { color: '#832a75', width: 3 },
        marker: {
          color: markerColors,
          size: markerSizes,
          symbol: markerSymbols,
          line: { width: 2, color: '#fff' }
        },
        hovertemplate: `Date: %{x}<br>${this.selectedPredictor.name}: %{y} ${unit} <extra></extra>`
      }
    ];

    if (missingMonthDates.length > 0) {
      data.push({
        type: 'scatter',
        mode: 'markers',
        name: 'Missing Month',
        x: missingMonthDates,
        y: missingMonthDates.map(() => null),
        marker: {
          color: '#f57c00',
          symbol: 'line-ns',
          size: 16,
          line: { width: 2, color: '#f57c00' }
        },
        showlegend: true,
        hoverinfo: 'skip'
      });
    }

    let height: number = 400;

    var layout: any = {
      height: height,
      autosize: true,
      plot_bgcolor: "#e7f1f2",
      paper_bgcolor: "#e7f1f2",
      legend: {
        orientation: "h"
      },
      shapes: missingMonthShapes,
      xaxis: {
        hoverformat: "%b, %Y",
      },
      yaxis: {
        title: {
          text: `${this.selectedPredictor.name} ${unit}`,
          font: {
            size: 16,
            weight: "bold"
          },
          standoff: 18
        },
        automargin: true,
      },
      margin: { r: 0, t: 50 }
    };
    var config = {
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
      modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.predictorTimeSeriesGraph.nativeElement, data, layout, config);
  }


  getMarker(dataValue: number) {
    if (dataValue >= this.stats.medianminus2_5MAD && dataValue <= this.stats.medianplus2_5MAD) {
      return {
        size: 8,
        color: '#43a047',
        symbol: 'circle',
        line: { width: 2, color: '#fff' }
      };
    } else {
      return {
        size: 12,
        color: '#d32f2f',
        symbol: 'x',
        line: { width: 2, color: '#fff' }
      };
    }
  }
}


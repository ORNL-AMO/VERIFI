import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { VisualizationStateService } from 'src/app/data-evaluation/facility/visualization/visualization-state.service';
import { IdbUtilityMeter, MeterCharge } from 'src/app/models/idbModels/utilityMeter';
import * as _ from 'lodash';
import * as jStat from 'jstat';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { IdbUtilityMeterData, MeterDataCharge } from 'src/app/models/idbModels/utilityMeterData';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFuntions';

@Component({
  selector: 'app-meter-charges-correlation-plot',
  standalone: false,
  templateUrl: './meter-charges-correlation-plot.component.html',
  styleUrl: './meter-charges-correlation-plot.component.css'
})
export class MeterChargesCorrelationPlotComponent {
  @Input({ required: true }) meter: IdbUtilityMeter;
  @Input({ required: true }) charge: MeterCharge;
  @Input({ required: true }) compareTo: 'totalCost' | 'energyUse' | 'demand';



  @ViewChild('matrixPlot', { static: false }) matrixPlot: ElementRef;
  monthNames: Array<string> = ["Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  dates: Array<Date>;
  xValues: Array<number>;
  yValues: Array<number>;
  bestFit: string;
  r2Value: number;
  xLabel: string;
  yLabel: string;
  jstatModel: JStatRegressionModel;
  constructor(private plotlyService: PlotlyService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnChanges(): void {
    this.setData();
    this.setRegressionPlotDataItem();
    this.drawScatterPlot();
  }

  ngAfterViewInit() {
    this.drawScatterPlot();
  }

  drawScatterPlot() {
    if (this.matrixPlot) {
      let trace1 = {
        x: this.xValues,
        y: this.yValues,
        text: this.dates.map(valueDate => { return this.monthNames[valueDate.getMonth()] + ', ' + valueDate.getFullYear() }),
        mode: 'markers',
        type: 'scatter',
        name: "Plot Data",
        marker: {
          color: this.xValues.map(() => { return 'black' }),
        },
        hovertemplate: "%{text}<br>%{yaxis.title.text}: %{y}<br>%{xaxis.title.text}: %{x}<br><extra></extra>"
      };

      let data = [trace1];

      if (this.bestFit) {
        let xMin: number = _.min(this.xValues);
        let xMax: number = _.max(this.xValues);
        let yMinRegressionValue: number = this.jstatModel.coef[0] + (this.jstatModel.coef[1] * xMin);
        let yMaxRegressionValue: number = this.jstatModel.coef[0] + (this.jstatModel.coef[1] * xMax);

        let trace2 = {
          x: [xMin, xMax],
          y: [yMinRegressionValue, yMaxRegressionValue],
          mode: "lines",
          type: "scatter",
          name: "Best Fit: " + this.bestFit,
          hoverinfo: 'none',
          marker: {
            color: undefined
          },
          hovertemplate: '',
          text: []
        }
        data.push(trace2);
      }


      let layout = {
        plot_bgcolor: "#e7f1f2",
        paper_bgcolor: "#e7f1f2",
        height: 300,
        xaxis: {
          title: {
            text: this.xLabel
          }
        },
        yaxis: {
          title: {
            text: this.yLabel
          },
        },
        showlegend: false,
        margin: { t: 10, r: 10 }
      }
      let config = {
        displaylogo: false,
        responsive: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
      };
      this.plotlyService.newPlot(this.matrixPlot.nativeElement, data, layout, config);
    }
  }

  getSigFigs(val: number): string {
    return (val).toLocaleString(undefined, { maximumSignificantDigits: 5 });
  }


  setData() {
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.meter.guid);
    meterData = _.sortBy(meterData, (data) => new Date(data.readDate).getTime(), 'desc');
    this.dates = new Array();
    this.xValues = new Array();
    this.yValues = new Array();
    meterData.forEach(mData => {
      let meterDataCharge: MeterDataCharge = mData.charges.find(c => {
        return c.chargeGuid == this.charge.guid
      });
      if (meterDataCharge?.chargeAmount) {
        this.yValues.push(meterDataCharge.chargeAmount)
        this.dates.push(new Date(mData.readDate));
        if (this.compareTo == 'totalCost') {
          this.xValues.push(mData.totalCost);
        } else if (this.compareTo == 'demand') {
          if (mData.totalBilledDemand) {
            this.xValues.push(mData.totalBilledDemand);
          } else {
            this.xValues.push(mData.totalRealDemand);
          }
        } else {
          if (getIsEnergyMeter(this.meter.source)) {
            this.xValues.push(mData.totalEnergyUse);
          } else {
            this.xValues.push(mData.totalVolume);
          }
        }
      }
    });
  }

  setRegressionPlotDataItem() {
    this.setData();
    let endog: Array<number> = this.yValues;
    let exog: Array<Array<number>> = this.xValues.map(val => { return [1, val] });
    try {
      this.jstatModel = jStat.models.ols(endog, exog);
      this.yLabel = this.charge.name;
      this.xLabel = 'Energy Use';
      if (this.compareTo == 'totalCost') {
        this.xLabel = 'Total Cost';
      } else if (this.compareTo == 'demand') {
        this.xLabel = 'Demand';
      }
      this.r2Value = this.jstatModel.R2;
      let coefStr: Array<string> = new Array();
      this.jstatModel.coef.forEach(coef => {
        let str: string = this.getSigFigs(coef);
        coefStr.push(str);
      });

      this.bestFit = coefStr[0] + ' + ' + '(' + coefStr[1] + ' * ' + this.xLabel + ')';

    } catch (err) {
      this.bestFit = undefined;
      console.log('error', err);
    }
  }
}

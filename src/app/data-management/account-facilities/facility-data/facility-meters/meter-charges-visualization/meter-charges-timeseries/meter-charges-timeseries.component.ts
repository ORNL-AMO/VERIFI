import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash'
@Component({
  selector: 'app-meter-charges-timeseries',
  standalone: false,
  templateUrl: './meter-charges-timeseries.component.html',
  styleUrl: './meter-charges-timeseries.component.css'
})
export class MeterChargesTimeseriesComponent {
  @Input({ required: true }) meter: IdbUtilityMeter;

  @ViewChild('chargesTimeseries', { static: false }) chargesTimeseries: ElementRef;


  viewInitialized: boolean = false;

  constructor(private plotlyService: PlotlyService,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }


  ngOnChanges() {
    this.drawChart();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.chargesTimeseries) {
      // this.meterData = this.meterData.slice().sort((a, b) => new Date(a.readDate).getTime() - new Date(b.readDate).getTime());
      // let markers: Array<{
      //   color: string,
      //   symbol: string,
      //   size: number
      // }> = this.meterData.map(data => { return this.getMarker(data.totalCost) });

      // let markerSizes: Array<number> = markers.map(marker => marker.size);
      // let markerColors: Array<string> = markers.map(marker => marker.color);
      // let markerSymbols: Array<string> = markers.map(marker => marker.symbol);

      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.meter.guid);
      meterData = _.sortBy(meterData, (data) => new Date(data.readDate).getTime(), 'desc');

      var data = [
        {
          type: "scatter",
          mode: "lines+markers",
          name: 'Total Cost',
          x: meterData.map(data => { return data.readDate }),
          y: meterData.map(data => { return data.totalCost }),
          line: { color: '#832a75', width: 3 },
          // marker: {
          //   color: markerColors,
          //   size: markerSizes,
          //   symbol: markerSymbols,
          //   line: { width: 2, color: '#fff' }
          // },
          hovertemplate: 'Date: %{x}<br>Cost: $%{y}<extra></extra>',
        }
      ];

      this.meter.charges.forEach(charge => {
        data.push(
          {
            type: "scatter",
            mode: "lines+markers",
            name: charge.name,
            x: meterData.map(data => { return data.readDate }),
            y: meterData.map(data => { return data.charges.find(c => { return c.chargeGuid == charge.guid }).chargeAmount }),
            line: { color: '#832a75', width: 3 },
            // marker: {
            //   color: markerColors,
            //   size: markerSizes,
            //   symbol: markerSymbols,
            //   line: { width: 2, color: '#fff' }
            // },
            hovertemplate: 'Date: %{x}<br>' + charge.name + ': $%{y}<extra></extra>',
          })
      })


      let height: number = 400;
      var layout = {
        height: height,
        autosize: true,
        plot_bgcolor: "#e7f1f2",
        paper_bgcolor: "#e7f1f2",
        legend: {
          orientation: "h"
        },
        xaxis: {
          hoverformat: "%b, %Y"
        },
        yaxis: {
          title: {
            text: 'Cost ($)',
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
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.chargesTimeseries.nativeElement, data, layout, config);
    }

  }


  // getMarker(cost: number) {
  //   if (cost >= this.costStats.medianminus2_5MAD && cost <= this.costStats.medianplus2_5MAD) {
  //     return {
  //       size: 8,
  //       color: '#43a047',
  //       symbol: 'circle',
  //       line: { width: 2, color: '#fff' }
  //     };
  //   } else {
  //     return {
  //       size: 12,
  //       color: '#d32f2f',
  //       symbol: 'x',
  //       line: { width: 2, color: '#fff' }
  //     };
  //   }
  // }
}

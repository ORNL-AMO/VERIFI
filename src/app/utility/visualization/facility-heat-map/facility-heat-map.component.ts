import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { VisualizationService } from '../visualization.service';

@Component({
  selector: 'app-facility-heat-map',
  templateUrl: './facility-heat-map.component.html',
  styleUrls: ['./facility-heat-map.component.css']
})
export class FacilityHeatMapComponent implements OnInit {

  @ViewChild('facilityHeatMap', { static: false }) facilityHeatMap: ElementRef;
  facilityMetersSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number> }>;
  months: Array<string>;
  years: Array<number>;
  constructor(private plotlyService: PlotlyService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private vizualizationService: VisualizationService) { }

  ngOnInit(): void {
    this.facilityMetersSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(data => {
      if (data) {
        let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
        this.facilityMeters = JSON.parse(JSON.stringify(facilityMeters));
        this.setGraphData();
      }
    });
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.facilityHeatMap) {
      let zData: Array<Array<number>> = this.resultData.map(dataItem => {
        return dataItem.monthlyCost
      });
      let months: Array<string> = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
      var data = [
        {
          z: zData,
          x: months,
          y: this.years,
          text: zData,
          type: 'heatmap',
          hoverongaps: false,
          hovertemplate: '%{x}, %{y}: %{z:$,.0f}<extra></extra>'
        }
      ];

      let layout = {
        title: {
          text: 'Utility Costs',
          font: {
            size: 24
          },
        },
        annotations: [],
        xaxis: {
          side: 'top'
        },
        yaxis: {
        }
      };

      for ( var i = 0; i < this.years.length; i++ ) {
        for ( var j = 0; j < months.length; j++ ) {
          // var currentValue = zData[i][j];
          // if (currentValue != 0.0) {
          //   var textColor = '';
          // }else{
          //   var textColor = 'black';
          // }
          var result = {
            xref: 'x1',
            yref: 'y1',
            x: months[j],
            y: this.years[i],
            text: '$'+ Math.round(zData[i][j]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            font: {
              // family: 'Arial',
              size: 12,
              // color: 'rgb(50, 171, 96)'
              color: 'white',
            },
            showarrow: false,
          };
          layout.annotations.push(result);
        }
      }
      let config = {
        responsive: true
      }
      this.plotlyService.newPlot(this.facilityHeatMap.nativeElement, data, layout, config);
    }
  }

  setGraphData() {
    if (this.facilityMeters) {
      let heatMapData: { resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number> }>, months: Array<string>, years: Array<number> } = this.vizualizationService.getMeterHeatMapData(this.facilityMeters);
      this.resultData = heatMapData.resultData;
      this.months = heatMapData.months;
      this.years = heatMapData.years;
      this.drawChart();
    }
  }

}

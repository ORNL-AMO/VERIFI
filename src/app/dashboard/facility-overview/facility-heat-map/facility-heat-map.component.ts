import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { HeatMapData, VisualizationService } from '../../../utility/visualization/visualization.service';

@Component({
  selector: 'app-facility-heat-map',
  templateUrl: './facility-heat-map.component.html',
  styleUrls: ['./facility-heat-map.component.css']
})
export class FacilityHeatMapComponent implements OnInit {

  @ViewChild('facilityHeatMap', { static: false }) facilityHeatMap: ElementRef;
  resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number> }>;
  months: Array<string>;
  years: Array<number>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  accountMeterDataSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  accountMeters: Array<IdbUtilityMeter>;
  accountMetersSub: Subscription;
  constructor(private plotlyService: PlotlyService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private vizualizationService: VisualizationService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.accountMetersSub = this.utilityMeterDbService.accountMeters.subscribe(accountMeters => {
      this.accountMeters = accountMeters;
      this.setGraphData();
    });


    this.selectedFacilitySub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.facilityMeters = JSON.parse(JSON.stringify(facilityMeters));
      this.setGraphData();
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(accountMeterData => {
      if (accountMeterData && accountMeterData.length != 0) {
        this.setGraphData();
      }
    });
  }

  ngAfterViewInit() {
    this.setGraphData()
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.accountMetersSub.unsubscribe();
  }

  setGraphData() {
    if (this.facilityMeters && this.facilityMeters.length != 0 && this.accountMeters && this.accountMeters.length != 0) {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let heatMapData: HeatMapData = this.vizualizationService.getMeterHeatMapData(this.facilityMeters, selectedFacility.name, true, false);
      this.resultData = heatMapData.resultData;
      this.months = heatMapData.months;
      this.years = heatMapData.years;
      this.drawChart();
    }
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
        // title: {
        //   text: 'Utility Costs',
        //   font: {
        //     size: 24
        //   },
        // },
        annotations: [],
        xaxis: {
          side: 'top'
        },
        yaxis: {
        }
      };

      for (var i = 0; i < this.years.length; i++) {
        for (var j = 0; j < months.length; j++) {
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
            text: '$' + Math.round(zData[i][j]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
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


}

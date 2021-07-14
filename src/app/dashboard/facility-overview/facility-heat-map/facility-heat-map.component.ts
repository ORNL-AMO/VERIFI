import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { HeatMapData } from 'src/app/models/visualization';
import { VisualizationService } from '../../../shared/helper-services/visualization.service';
import { DashboardService } from '../../dashboard.service';

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
  graphDisplay: "cost" | "usage";
  graphDisplaySub: Subscription;
  constructor(private plotlyService: PlotlyService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private vizualizationService: VisualizationService,
    private facilityDbService: FacilitydbService, private dashboardService: DashboardService) { }

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

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      this.graphDisplay = value;
      this.setGraphData();
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
    if (this.facilityMeters && this.facilityMeters.length != 0 && this.accountMeters && this.accountMeters.length != 0 && this.graphDisplay) {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let heatMapData: HeatMapData = this.vizualizationService.getMeterHeatMapData(this.facilityMeters, selectedFacility.name, false);
      this.resultData = heatMapData.resultData;
      this.months = heatMapData.months;
      this.years = heatMapData.years;
      this.drawChart();
    }
  }

  drawChart() {
    if (this.facilityHeatMap) {
      let zData: Array<Array<number>> = this.resultData.map(dataItem => {
        if (this.graphDisplay == "cost") {
          return dataItem.monthlyCost
        } else {
          return dataItem.monthlyEnergy
        }
      });

      let hovertemplate: string = '%{x}, %{y}: %{z:$,.0f}<extra></extra>';
      let labelPrepend: string = "$"
      if (this.graphDisplay == "usage") {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        hovertemplate = '%{y}, %{x}: %{z:,.0f} ' + selectedFacility.energyUnit + '<extra></extra>';
        labelPrepend = "";
      }

      let months: Array<string> = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
      let data = [
        {
          z: zData,
          x: months,
          y: this.years,
          text: zData,
          type: 'heatmap',
          hoverongaps: false,
          hovertemplate: hovertemplate
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
          dtick: 1
        }
      };

      for (let i = 0; i < this.years.length; i++) {
        for (let j = 0; j < months.length; j++) {
          let result = {
            xref: 'x1',
            yref: 'y1',
            x: months[j],
            y: this.years[i],
            text: labelPrepend + Math.round(zData[i][j]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            font: {
              family: 'Roboto',
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

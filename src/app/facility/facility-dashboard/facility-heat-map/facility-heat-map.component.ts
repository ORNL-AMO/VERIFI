import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { HeatMapData } from 'src/app/models/visualization';
import { VisualizationService } from '../../../shared/helper-services/visualization.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Component({
  selector: 'app-facility-heat-map',
  templateUrl: './facility-heat-map.component.html',
  styleUrls: ['./facility-heat-map.component.css']
})
export class FacilityHeatMapComponent implements OnInit {

  @ViewChild('facilityHeatMap', { static: false }) facilityHeatMap: ElementRef;
  resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number>, monthlyEmissions: Array<number> }>;
  months: Array<string>;
  years: Array<number>;
  accountMetersSub: Subscription;
  graphDisplay: "cost" | "usage" | "emissions";
  graphDisplaySub: Subscription;

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;
  constructor(private plotlyService: PlotlyService, private vizualizationService: VisualizationService,
    private facilityDbService: FacilitydbService, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.calanderizedMetersSub = this.dashboardService.calanderizedFacilityMeters.subscribe(cMeters => {
      this.calanderizedMeters = JSON.parse(JSON.stringify(cMeters));
      this.setGraphData();
    })

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      this.graphDisplay = value;
      this.setGraphData();
    });

  }

  ngAfterViewInit() {
    this.setGraphData()
  }

  ngOnDestroy() {
    this.calanderizedMetersSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }

  setGraphData() {
    if (this.calanderizedMeters && this.calanderizedMeters.length != 0 && this.graphDisplay && this.facilityHeatMap) {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let heatMapData: HeatMapData = this.vizualizationService.getMeterHeatMapData(this.calanderizedMeters, selectedFacility.name);
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
        } else if(this.graphDisplay == "usage") {
          return dataItem.monthlyEnergy
        } else if(this.graphDisplay == "emissions"){
          return dataItem.monthlyEmissions
        }
      });

      let hovertemplate: string = '%{x}, %{y}: %{z:$,.0f}<extra></extra>';
      let labelPrepend: string = "$"
      if (this.graphDisplay == "usage") {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        hovertemplate = '%{y}, %{x}: %{z:,.0f} ' + selectedFacility.energyUnit + '<extra></extra>';
        labelPrepend = "";
      }else if(this.graphDisplay == "emissions"){
        hovertemplate = '%{y}, %{x}: %{z:,.0f} kg CO<sub>2</sub><extra></extra>';
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
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.facilityHeatMap.nativeElement, data, layout, config);
    }
  }


}

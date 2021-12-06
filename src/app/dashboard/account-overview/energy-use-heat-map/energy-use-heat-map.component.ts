import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import * as _ from 'lodash';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { HeatMapData } from 'src/app/models/visualization';
import { DashboardService } from '../../dashboard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
@Component({
  selector: 'app-energy-use-heat-map',
  templateUrl: './energy-use-heat-map.component.html',
  styleUrls: ['./energy-use-heat-map.component.css']
})
export class EnergyUseHeatMapComponent implements OnInit {

  @ViewChild('energyUseHeatMap', { static: false }) energyUseHeatMap: ElementRef;
  accountFacilitiesSub: Subscription;
  facilityHeatMapData: Array<HeatMapData>;
  graphDisplay: "cost" | "usage" | "emissions";
  graphDisplaySub: Subscription;

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private visualizationService: VisualizationService,
    private plotlyService: PlotlyService, private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService, private dashboardService: DashboardService,
    private accountdbService: AccountdbService) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.setData();
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(val => {
      this.graphDisplay = val;
      this.setData();
    })
  }

  ngOnDestroy() {
    this.accountFacilitiesSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.setData();
  }

  drawChart() {
    if (this.energyUseHeatMap && this.facilityHeatMapData && this.facilityHeatMapData.length != 0 && this.graphDisplay) {
      let hovertemplate: string = '%{y}, %{x}: %{z:$,.0f}<extra></extra>';
      let textPrefix: string = "$";
      if (this.graphDisplay == "usage") {
        let selectedAccount: IdbAccount = this.accountdbService.selectedAccount.getValue();
        hovertemplate = '%{y}, %{x}: %{z:,.0f} ' + selectedAccount.energyUnit + '<extra></extra>';
        textPrefix = "";
      } else if (this.graphDisplay == "emissions") {
        hovertemplate = '%{y}, %{x}: %{z:,.0f} kg CO<sub>2</sub><extra></extra>';
        textPrefix = "";
      }


      let layout = {
        // title: {
        //   text: 'Utility Costs',
        //   font: {
        //     size: 24
        //   },
        // },
        annotations: [],
        xaxis: {
          side: 'top',
        },
        yaxis: {
          automargin: true,
          dtick: 1
        },
        margin: { "t": 50, "b": 50 },
      };
      let individualData = new Array();
      this.facilityHeatMapData.forEach(heatMapData => {
        let zData: Array<Array<number>> = heatMapData.resultData.map(dataItem => {
          if (this.graphDisplay == "cost") {
            return dataItem.monthlyCost
          } else if(this.graphDisplay == "usage") {
            return dataItem.monthlyEnergy;
          }else if(this.graphDisplay == "emissions"){
            return dataItem.monthlyEmissions;
          }
        });
        let months: Array<string> = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        individualData.push({
          z: zData,
          x: months,
          y: heatMapData.years.map(year => { return heatMapData.facilityName + ' (' + year + ')' }),
          // type: 'heatmapgl',
          hoverongaps: false,
          hovertemplate: hovertemplate
        });
        for (let i = 0; i < heatMapData.years.length; i++) {
          for (let j = 0; j < months.length; j++) {
            let result = {
              xref: 'x1',
              yref: 'y1',
              x: months[j],
              y: heatMapData.facilityName + ' (' + heatMapData.years[i] + ')',
              text: textPrefix + Math.round(zData[i][j]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
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
      });
      let data = [{
        z: individualData.flatMap(dataItem => { return dataItem.z }),
        x: individualData[0].x,
        y: individualData.flatMap(dataItem => { return dataItem.y }),
        type: 'heatmap',
        hoverongaps: false,
        hovertemplate: hovertemplate
      }]

      let config = {
        responsive: true
      }
      this.plotlyService.newPlot(this.energyUseHeatMap.nativeElement, data, layout, config);
    }
  }

  setData() {
    this.facilityHeatMapData = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (accountMeters.length != 0 && accountFacilites.length != 0 && this.graphDisplay) {
      //filter by facility
      let facilityIds: Array<number> = accountMeters.map(meter => { return meter.facilityId });
      facilityIds = _.uniq(facilityIds);
      facilityIds.forEach(id => {
        let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == id });
        let facility: IdbFacility = accountFacilites.find(facility => { return facility.id == id });
        let facilityHeatMapData: HeatMapData = this.visualizationService.getMeterHeatMapData(facilityMeters, facility.name, true);
        this.facilityHeatMapData.push(facilityHeatMapData);
      });
      this.drawChart();
    }
  }
}

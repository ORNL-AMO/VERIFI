import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AccountOverviewService } from '../../account-overview.service';
import { Subscription } from 'rxjs';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { PlotlyService } from 'angular-plotly.js';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { StackedBarChartData, UtilityItem } from 'src/app/models/dashboard';
import * as _ from 'lodash';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Component({
  selector: 'app-utility-water-chart',
  templateUrl: './utility-water-chart.component.html',
  styleUrls: ['./utility-water-chart.component.css']
})
export class UtilityWaterChartComponent implements OnInit {
  @ViewChild('waterStackedBarChart', { static: false }) waterStackedBarChart: ElementRef;

  accountFacilitiesSub: Subscription;
  barChartData: Array<StackedBarChartData>;
  constructor(private accountOverviewService: AccountOverviewService, private accountDbService: AccountdbService,
    private plotlyService: PlotlyService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.accountOverviewService.accountFacilitiesWaterSummary.subscribe(val => {
      this.setBarChartData();
      this.drawChart();
    });
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnDestroy() {
    this.accountFacilitiesSub.unsubscribe();
  }

  drawChart() {
    if (this.waterStackedBarChart) {
      if (this.barChartData && this.barChartData.length != 0) {

        let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
        let yaxisTitle: string = "Water Usage (" + selectedAccount.volumeLiquidUnit + ")";

        let data = new Array();
        if (this.barChartData.findIndex(dataItem => { return dataItem.water.energyUse != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.water.energyUse }),
            name: 'Water',
            type: 'bar',
            marker: {
              color: UtilityColors.Water.color
            }
          });
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.wasteWater.energyUse != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.wasteWater.energyUse }),
            name: 'Waste Water',
            type: 'bar',
            marker: {
              color: UtilityColors['Waste Water'].color
            }
          })
        }


        var layout = {
          barmode: 'stack',
          showlegend: true,
          yaxis: {
            title: yaxisTitle,
            automargin: true,
          },
          xaxis: {
            automargin: true
          },
          legend: {
            orientation: "h"
          },
          clickmode: "none",
          margin: { t: 10 }
        };
        let config = {
          modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
          displaylogo: false,
          responsive: true,
        };
        this.plotlyService.newPlot(this.waterStackedBarChart.nativeElement, data, layout, config);
      }
    }
  }

  setBarChartData() {
    this.barChartData = new Array();
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    accountFacilites.forEach(facility => {
      let wasteWater: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let water: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };

      let facilityMeters: Array<CalanderizedMeter> = this.accountOverviewService.calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
      facilityMeters.forEach(cMeter => {
        cMeter.monthlyData.forEach(dataItem => {
          if (cMeter.meter.source == 'Water') {
            water.energyUse = (water.energyUse + Number(dataItem.energyConsumption));
            water.energyCost = (water.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Waste Water') {
            wasteWater.energyUse = (wasteWater.energyUse + Number(dataItem.energyConsumption));
            wasteWater.energyCost = (wasteWater.energyCost + Number(dataItem.energyCost));
          }
        });
      });
      if (facility) {
        this.barChartData.push({
          facilityName: facility.name,
          electricity: undefined,
          naturalGas: undefined,
          otherFuels: undefined,
          otherEnergy: undefined,
          wasteWater: wasteWater,
          water: water,
          otherUtility: undefined
        });
      }
    });

    this.barChartData = _.orderBy(this.barChartData, (data) => {
      return (data.wasteWater.energyUse + data.water.energyUse);
    }, 'desc');
  }

}

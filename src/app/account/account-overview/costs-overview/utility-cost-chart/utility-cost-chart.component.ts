import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AccountOverviewService } from '../../account-overview.service';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { PlotlyService } from 'angular-plotly.js';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { StackedBarChartData, UtilityItem } from 'src/app/models/dashboard';
import * as _ from 'lodash';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Component({
  selector: 'app-utility-cost-chart',
  templateUrl: './utility-cost-chart.component.html',
  styleUrls: ['./utility-cost-chart.component.css']
})
export class UtilityCostChartComponent implements OnInit {
  @ViewChild('costsStackedBarChart', { static: false }) costsStackedBarChart: ElementRef;

  accountFacilitiesSub: Subscription;
  barChartData: Array<StackedBarChartData>;
  constructor(private accountOverviewService: AccountOverviewService,
    private plotlyService: PlotlyService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(val => {
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
    if (this.costsStackedBarChart) {
      if (this.barChartData && this.barChartData.length != 0) {
        let tickprefix: string = "$";
        let yaxisTitle: string = "Utility Costs";
        let data = new Array();
        if (this.barChartData.findIndex(dataItem => { return dataItem.electricity.energyCost != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.electricity.energyCost }),
            name: 'Electricity',
            type: 'bar',
            marker: {
              color: UtilityColors.Electricity.color
            }
          });
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.naturalGas.energyCost != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.naturalGas.energyCost }),
            name: 'Natural Gas',
            type: 'bar',
            marker: {
              color: UtilityColors['Natural Gas'].color
            }
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherFuels.energyCost != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.otherFuels.energyCost }),
            name: 'Other Fuels',
            type: 'bar',
            marker: {
              color: UtilityColors['Other Fuels'].color
            }
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherEnergy.energyCost != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.otherEnergy.energyCost }),
            name: 'Other Energy',
            type: 'bar',
            marker: {
              color: UtilityColors['Other Energy'].color
            }
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.water.energyCost != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.water.energyCost }),
            name: 'Water',
            type: 'bar',
            marker: {
              color: UtilityColors['Water'].color
            }
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.wasteWater.energyCost != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.wasteWater.energyCost }),
            name: 'Waste Water',
            type: 'bar',
            marker: {
              color: UtilityColors['Waste Water'].color
            }
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherUtility.energyCost != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.otherUtility.energyCost }),
            name: 'Other Utility',
            type: 'bar',
            marker: {
              color: UtilityColors['Other Utility'].color
            }
          })
        }

        var layout = {
          barmode: 'stack',
          showlegend: true,
          yaxis: {
            title: yaxisTitle,
            tickprefix: tickprefix,
            automargin: true,
            // ticksuffix: ticksuffix
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
        this.plotlyService.newPlot(this.costsStackedBarChart.nativeElement, data, layout, config);
      }
    }
  }


  setBarChartData() {
    this.barChartData = new Array();
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    accountFacilites.forEach(facility => {
      let electricity: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let naturalGas: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let otherFuels: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let otherEnergy: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let water: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let wasteWater: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let otherUtility: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let facilityMeters: Array<CalanderizedMeter> = this.accountOverviewService.calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
      facilityMeters.forEach(cMeter => {
        cMeter.monthlyData.forEach(dataItem => {
          if (cMeter.meter.source == 'Electricity') {
            electricity.energyCost = (electricity.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Natural Gas') {
            naturalGas.energyCost = (naturalGas.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Other Fuels') {
            otherFuels.energyCost = (otherFuels.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Other Energy') {
            otherEnergy.energyCost = (otherEnergy.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Water') {
            water.energyCost = (water.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Waste Water') {
            wasteWater.energyCost = (wasteWater.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Other Utility') {
            otherUtility.energyCost = (otherUtility.energyCost + Number(dataItem.energyCost));
          }
        });
      });
      if (facility) {
        this.barChartData.push({
          facilityName: facility.name,
          electricity: electricity,
          naturalGas: naturalGas,
          otherFuels: otherFuels,
          otherEnergy: otherEnergy,
          water: water,
          wasteWater: wasteWater,
          otherUtility: otherUtility
        });
      }
    });


    this.barChartData = _.orderBy(this.barChartData, (data) => {
      return (data.electricity.energyCost + data.naturalGas.energyCost + data.otherFuels.energyCost + data.otherEnergy.energyCost
        + data.water.energyCost + data.wasteWater.energyCost + data.otherUtility.energyCost);
    }, 'desc');
  }
}

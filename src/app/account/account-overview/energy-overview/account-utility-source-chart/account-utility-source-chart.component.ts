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
  selector: 'app-account-utility-source-chart',
  templateUrl: './account-utility-source-chart.component.html',
  styleUrls: ['./account-utility-source-chart.component.css']
})
export class AccountUtilitySourceChartComponent implements OnInit {
  @ViewChild('energyUseStackedBarChart', { static: false }) energyUseStackedBarChart: ElementRef;

  accountFacilitiesSub: Subscription;
  barChartData: Array<StackedBarChartData>;
  constructor(private accountOverviewService: AccountOverviewService, private accountDbService: AccountdbService,
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
    if (this.energyUseStackedBarChart) {
      if (this.barChartData && this.barChartData.length != 0) {

        let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
        let yaxisTitle: string = "Utility Usage (" + selectedAccount.energyUnit + ")";

        let data = new Array();
        if (this.barChartData.findIndex(dataItem => { return dataItem.electricity.energyUse != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.electricity.energyUse }),
            name: 'Electricity',
            type: 'bar',
            marker: {
              color: UtilityColors.Electricity.color
            }
          });
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.naturalGas.energyUse != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.naturalGas.energyUse }),
            name: 'Natural Gas',
            type: 'bar',
            marker: {
              color: UtilityColors['Natural Gas'].color
            }
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherFuels.energyUse != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.otherFuels.energyUse }),
            name: 'Other Fuels',
            type: 'bar',
            marker: {
              color: UtilityColors['Other Fuels'].color
            }
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherEnergy.energyUse != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.otherEnergy.energyUse }),
            name: 'Other Energy',
            type: 'bar',
            marker: {
              color: UtilityColors['Other Energy'].color
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
        this.plotlyService.newPlot(this.energyUseStackedBarChart.nativeElement, data, layout, config);
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

      let facilityMeters: Array<CalanderizedMeter> = this.accountOverviewService.calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
      facilityMeters.forEach(cMeter => {
        cMeter.monthlyData.forEach(dataItem => {
          if (cMeter.meter.source == 'Electricity') {
            electricity.energyUse = (electricity.energyUse + Number(dataItem.energyUse));
            electricity.energyCost = (electricity.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Natural Gas') {
            naturalGas.energyUse = (naturalGas.energyUse + Number(dataItem.energyUse));
            naturalGas.energyCost = (naturalGas.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Other Fuels') {
            otherFuels.energyUse = (otherFuels.energyUse + Number(dataItem.energyUse));
            otherFuels.energyCost = (otherFuels.energyCost + Number(dataItem.energyCost));
          }
          else if (cMeter.meter.source == 'Other Energy') {
            otherEnergy.energyUse = (otherEnergy.energyUse + Number(dataItem.energyUse));
            otherEnergy.energyCost = (otherEnergy.energyCost + Number(dataItem.energyCost));
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
          wasteWater: undefined,
          water: undefined,
          otherUtility: undefined
        });
      }
    });
    this.barChartData = _.orderBy(this.barChartData, (data) => {
      return (data.electricity.energyUse + data.naturalGas.energyUse + data.otherFuels.energyUse + data.otherEnergy.energyUse);
    }, 'desc');
  }

}
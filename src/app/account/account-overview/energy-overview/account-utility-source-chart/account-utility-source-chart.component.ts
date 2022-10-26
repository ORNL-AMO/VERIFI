import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AccountOverviewService } from '../../account-overview.service';
import { Subscription } from 'rxjs';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { PlotlyService } from 'angular-plotly.js';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

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
    private plotlyService: PlotlyService, private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.accountOverviewService.accountFacilitiesSummary.subscribe(val => {
      this.setBarChartData();
      this.drawChart();
    });
  }

  ngAfterViewInit(){
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
            // tickprefix: tickprefix,
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
        this.plotlyService.newPlot(this.energyUseStackedBarChart.nativeElement, data, layout, config);
      }
    }
  }

  setBarChartData() {
    this.barChartData = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMeterData: Array<IdbUtilityMeterData> = new Array();
    accountMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForAccount(meter, true);
      accountMeterData = accountMeterData.concat(meterData)
    });
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    accountFacilites.forEach(facility => {
      let electricity: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let naturalGas: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let otherFuels: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
      let otherEnergy: UtilityItem = { energyUse: 0, energyCost: 0, marketEmissions: 0, locationEmissions: 0 };
  
      let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == facility.guid });
      facilityMeterData.forEach(dataItem => {
        let meter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(dataItem.meterId);
        if (meter) {
          if (meter.source == 'Electricity') {
            electricity.energyUse = (electricity.energyUse + Number(dataItem.totalEnergyUse));
            electricity.energyCost = (electricity.energyCost + Number(dataItem.totalCost));
          }
          else if (meter.source == 'Natural Gas') {
            naturalGas.energyUse = (naturalGas.energyUse + Number(dataItem.totalEnergyUse));
            naturalGas.energyCost = (naturalGas.energyCost + Number(dataItem.totalCost));
          }
          else if (meter.source == 'Other Fuels') {
            otherFuels.energyUse = (otherFuels.energyUse + Number(dataItem.totalEnergyUse));
            otherFuels.energyCost = (otherFuels.energyCost + Number(dataItem.totalCost));
          }
          else if (meter.source == 'Other Energy') {
            otherEnergy.energyUse = (otherEnergy.energyUse + Number(dataItem.totalEnergyUse));
            otherEnergy.energyCost = (otherEnergy.energyCost + Number(dataItem.totalCost));
          }
        }
      });
      if (facility) {
        this.barChartData.push({
          facilityName: facility.name,
          electricity: electricity,
          naturalGas: naturalGas,
          otherFuels: otherFuels,
          otherEnergy: otherEnergy
        });
      }
    });
  }

}

export interface StackedBarChartData {
  facilityName: string
  electricity: UtilityItem,
  naturalGas: UtilityItem,
  otherFuels: UtilityItem,
  otherEnergy: UtilityItem
}

export interface UtilityItem {
  energyUse: number,
  energyCost: number,
  marketEmissions: number,
  locationEmissions: number
}
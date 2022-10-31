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
import { StackedBarChartData, UtilityItem } from 'src/app/models/dashboard';
import { CalanderizationService, EmissionsResults } from 'src/app/shared/helper-services/calanderization.service';


@Component({
  selector: 'app-utility-emissions-chart',
  templateUrl: './utility-emissions-chart.component.html',
  styleUrls: ['./utility-emissions-chart.component.css']
})
export class UtilityEmissionsChartComponent implements OnInit {
  @ViewChild('emissionsStackedBarChart', { static: false }) emissionsStackedBarChart: ElementRef;

  accountFacilitiesSub: Subscription;
  barChartData: Array<StackedBarChartData>;
  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private accountOverviewService: AccountOverviewService, private accountDbService: AccountdbService,
    private plotlyService: PlotlyService, private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.setBarChartData();
      this.drawChart();
    });

    this.accountFacilitiesSub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(val => {
      this.setBarChartData();
      this.drawChart();
    });
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnDestroy() {
    this.emissionsDisplaySub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
  }

  drawChart() {
    if (this.emissionsStackedBarChart) {
      if (this.barChartData && this.barChartData.length != 0) {

        let yaxisTitle: string = "Emissions (kg CO<sub>2</sub>)";

        let data = new Array();
        if (this.barChartData.findIndex(dataItem => { return dataItem.electricity.marketEmissions != 0 }) != -1) {
          let yValues: Array<number>;
          if(this.emissionsDisplay == 'location'){
            yValues = this.barChartData.map(dataItem => { return dataItem.electricity.locationEmissions });
          }else{
            yValues = this.barChartData.map(dataItem => { return dataItem.electricity.marketEmissions });
          }

          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: yValues,
            name: 'Electricity',
            type: 'bar',
            marker: {
              color: UtilityColors.Electricity.color
            }
          });
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.naturalGas.marketEmissions != 0 }) != -1) {
          let yValues: Array<number>;
          if(this.emissionsDisplay == 'location'){
            yValues = this.barChartData.map(dataItem => { return dataItem.naturalGas.locationEmissions });
          }else{
            yValues = this.barChartData.map(dataItem => { return dataItem.naturalGas.marketEmissions });
          }
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: yValues,
            name: 'Natural Gas',
            type: 'bar',
            marker: {
              color: UtilityColors['Natural Gas'].color
            }
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherFuels.marketEmissions != 0 }) != -1) {
          let yValues: Array<number>;
          if(this.emissionsDisplay == 'location'){
            yValues = this.barChartData.map(dataItem => { return dataItem.otherFuels.locationEmissions });
          }else{
            yValues = this.barChartData.map(dataItem => { return dataItem.otherFuels.marketEmissions });
          }
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: yValues,
            name: 'Other Fuels',
            type: 'bar',
            marker: {
              color: UtilityColors['Other Fuels'].color
            }
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherEnergy.marketEmissions != 0 }) != -1) {
          let yValues: Array<number>;
          if(this.emissionsDisplay == 'location'){
            yValues = this.barChartData.map(dataItem => { return dataItem.otherEnergy.locationEmissions });
          }else{
            yValues = this.barChartData.map(dataItem => { return dataItem.otherEnergy.marketEmissions });
          }
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: yValues,
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
        this.plotlyService.newPlot(this.emissionsStackedBarChart.nativeElement, data, layout, config);
      }
    }
  }

  setBarChartData() {
    if (this.emissionsDisplay) {
      this.barChartData = new Array();
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
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
          let emissions: EmissionsResults = this.calanderizationService.getEmissions(meter, dataItem.totalEnergyUse, selectedAccount.energyUnit, selectedAccount.energyIsSource, new Date(dataItem.readDate).getFullYear());

          if (meter) {
            if (meter.source == 'Electricity') {
              electricity.marketEmissions = (electricity.marketEmissions + Number(emissions.marketEmissions));
              electricity.locationEmissions = (electricity.locationEmissions + Number(emissions.locationEmissions));
            }
            else if (meter.source == 'Natural Gas') {
              naturalGas.marketEmissions = (naturalGas.marketEmissions + Number(emissions.marketEmissions));
              naturalGas.locationEmissions = (naturalGas.locationEmissions + Number(emissions.locationEmissions));
            }
            else if (meter.source == 'Other Fuels') {
              otherFuels.marketEmissions = (otherFuels.marketEmissions + Number(emissions.marketEmissions));
              otherFuels.locationEmissions = (otherFuels.locationEmissions + Number(emissions.locationEmissions));
            }
            else if (meter.source == 'Other Energy') {
              otherEnergy.marketEmissions = (otherEnergy.marketEmissions + Number(emissions.marketEmissions));
              otherEnergy.locationEmissions = (otherEnergy.locationEmissions + Number(emissions.locationEmissions));
            }
          }
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
    }
  }
}

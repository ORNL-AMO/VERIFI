import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { StackedBarChartData, UtilityItem } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { ScopeValues } from 'src/app/models/constantsAndTypes';

@Component({
  selector: 'app-facilities-usage-stacked-bar-chart',
  templateUrl: './facilities-usage-stacked-bar-chart.component.html',
  styleUrls: ['./facilities-usage-stacked-bar-chart.component.css']
})
export class FacilitiesUsageStackedBarChartComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;
  @Input()
  waterUnit: string;
  @Input()
  energyUnit: string;
  @Input()
  reportOptions: DataOverviewReportSetup;
  @Input()
  dateRange: { startDate: Date, endDate: Date };
  @Input()
  emissionsDisplay: "market" | "location";


  @ViewChild('stackedBarChart', { static: false }) stackedBarChart: ElementRef;
  barChartData: Array<StackedBarChartData>;
  // emissionsDisplay: "market" | "location";
  // emissionsDisplaySub: Subscription;
  constructor(private accountOverviewService: AccountOverviewService,
    private plotlyService: PlotlyService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    // if (this.dataType == 'emissions') {
    //   this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
    //     this.emissionsDisplay = val;
    //     this.setBarChartData();
    //     this.drawChart();
    //   });
    // } else {
    //   this.setBarChartData();
    // }
    this.setBarChartData();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {

    if (!changes.dataType && ((changes.calanderizedMeters && !changes.calanderizedMeters.isFirstChange()) || (changes.dateRange && !changes.dateRange.isFirstChange()))) {
      this.setBarChartData();
      this.drawChart();
    }
  }
  ngOnDestroy() {
    // if (this.dataType == 'emissions') {
    //   this.emissionsDisplaySub.unsubscribe();
    // }
  }

  drawChart() {
    if (this.stackedBarChart) {
      if (this.barChartData && this.barChartData.length != 0) {
        let data = new Array();
        if (this.dataType == 'energyUse') {
          data = this.getEnergyUseData();
        } else if (this.dataType == 'cost') {
          data = this.getCostData();
        } else if (this.dataType == 'emissions') {
          data = this.getEmissionsData();
        } else if (this.dataType == 'water') {
          data = this.getWaterData();
        }


        var layout = {
          barmode: 'stack',
          showlegend: true,
          yaxis: {
            title: this.getYAxisTitle(),
            automargin: true,
            tickprefix: this.getTickPrefix()
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
        this.plotlyService.newPlot(this.stackedBarChart.nativeElement, data, layout, config);
      }
    }
  }

  getEnergyUseData(): Array<any> {
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
    return data;
  }

  getCostData(): Array<any> {
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
          color: UtilityColors['Water Intake'].color
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
          color: UtilityColors['Water Discharge'].color
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
    return data;
  }

  getEmissionsData(): Array<any> {
    let data = new Array();
    if (this.barChartData.findIndex(dataItem => { return dataItem.electricity.scope1LocationEmissions != 0 }) != -1) {
      let yValues: Array<number>;
      if (this.emissionsDisplay == 'location') {
        yValues = this.barChartData.map(dataItem => { return dataItem.electricity.scope1LocationEmissions });
      } else {
        yValues = this.barChartData.map(dataItem => { return dataItem.electricity.scope1MarketEmissions });
      }

      data.push({
        x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
        y: yValues,
        name: 'Electricity Scope 1',
        type: 'bar',
        marker: {
          color: this.getEmissionsTraceColor(1)
        }
      });
    }
    if (this.barChartData.findIndex(dataItem => { return dataItem.naturalGas.scope1LocationEmissions != 0 }) != -1) {
      let yValues: Array<number>;
      if (this.emissionsDisplay == 'location') {
        yValues = this.barChartData.map(dataItem => { return dataItem.naturalGas.scope1LocationEmissions });
      } else {
        yValues = this.barChartData.map(dataItem => { return dataItem.naturalGas.scope1MarketEmissions });
      }
      data.push({
        x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
        y: yValues,
        name: 'Natural Gas Scope 1',
        type: 'bar',
        marker: {
          color: this.getEmissionsTraceColor(1)
        }
      })
    }
    if (this.barChartData.findIndex(dataItem => { return dataItem.otherFuels.scope1LocationEmissions != 0 }) != -1) {
      let yValues: Array<number>;
      if (this.emissionsDisplay == 'location') {
        yValues = this.barChartData.map(dataItem => { return dataItem.otherFuels.scope1LocationEmissions });
      } else {
        yValues = this.barChartData.map(dataItem => { return dataItem.otherFuels.scope1MarketEmissions });
      }
      data.push({
        x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
        y: yValues,
        name: 'Other Fuels Scope 1',
        type: 'bar',
        marker: {
          color: this.getEmissionsTraceColor(1)
        }
      })
    }
    if (this.barChartData.findIndex(dataItem => { return dataItem.otherEnergy.scope1LocationEmissions != 0 }) != -1) {
      let yValues: Array<number>;
      if (this.emissionsDisplay == 'location') {
        yValues = this.barChartData.map(dataItem => { return dataItem.otherEnergy.scope1LocationEmissions });
      } else {
        yValues = this.barChartData.map(dataItem => { return dataItem.otherEnergy.scope1MarketEmissions });
      }
      data.push({
        x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
        y: yValues,
        name: 'Other Energy Scope 1',
        type: 'bar',
        marker: {
          color: this.getEmissionsTraceColor(1)
        }
      })
    }
    //scope 2
    if (this.barChartData.findIndex(dataItem => { return dataItem.electricity.scope2LocationEmissions != 0 }) != -1) {
      let yValues: Array<number>;
      if (this.emissionsDisplay == 'location') {
        yValues = this.barChartData.map(dataItem => { return dataItem.electricity.scope2LocationEmissions });
      } else {
        yValues = this.barChartData.map(dataItem => { return dataItem.electricity.scope2MarketEmissions });
      }

      data.push({
        x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
        y: yValues,
        name: 'Electricity Scope 2',
        type: 'bar',
        marker: {
          color: this.getEmissionsTraceColor(2)
        }
      });
    }
    if (this.barChartData.findIndex(dataItem => { return dataItem.naturalGas.scope2LocationEmissions != 0 }) != -1) {
      let yValues: Array<number>;
      if (this.emissionsDisplay == 'location') {
        yValues = this.barChartData.map(dataItem => { return dataItem.naturalGas.scope2LocationEmissions });
      } else {
        yValues = this.barChartData.map(dataItem => { return dataItem.naturalGas.scope2MarketEmissions });
      }
      data.push({
        x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
        y: yValues,
        name: 'Natural Gas Scope 2',
        type: 'bar',
        marker: {
          color: this.getEmissionsTraceColor(2)
        }
      })
    }
    if (this.barChartData.findIndex(dataItem => { return dataItem.otherFuels.scope2LocationEmissions != 0 }) != -1) {
      let yValues: Array<number>;
      if (this.emissionsDisplay == 'location') {
        yValues = this.barChartData.map(dataItem => { return dataItem.otherFuels.scope2LocationEmissions });
      } else {
        yValues = this.barChartData.map(dataItem => { return dataItem.otherFuels.scope2MarketEmissions });
      }
      data.push({
        x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
        y: yValues,
        name: 'Other Fuels Scope 2',
        type: 'bar',
        marker: {
          color: this.getEmissionsTraceColor(2)
        }
      })
    }
    if (this.barChartData.findIndex(dataItem => { return dataItem.otherEnergy.scope2LocationEmissions != 0 }) != -1) {
      let yValues: Array<number>;
      if (this.emissionsDisplay == 'location') {
        yValues = this.barChartData.map(dataItem => { return dataItem.otherEnergy.scope2LocationEmissions });
      } else {
        yValues = this.barChartData.map(dataItem => { return dataItem.otherEnergy.scope2MarketEmissions });
      }
      data.push({
        x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
        y: yValues,
        name: 'Other Energy Scope 2',
        type: 'bar',
        marker: {
          color: this.getEmissionsTraceColor(2)
        }
      })
    }
    return data;
  }

  getWaterData(): Array<any> {
    let data = new Array();
    if (this.barChartData.findIndex(dataItem => { return dataItem.water.energyUse != 0 }) != -1) {
      data.push({
        x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
        y: this.barChartData.map(dataItem => { return dataItem.water.energyUse }),
        name: 'Water',
        type: 'bar',
        marker: {
          color: UtilityColors["Water Intake"].color
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
          color: UtilityColors["Water Discharge"].color
        }
      })
    }
    return data;
  }


  setBarChartData() {
    this.barChartData = new Array();

    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let includedFacilityIds: Array<string> = new Array();
    if (this.reportOptions) {
      this.reportOptions.includedFacilities.forEach(facility => {
        if (facility.included) {
          includedFacilityIds.push(facility.facilityId);
        }
      })
    }


    accountFacilites.forEach(facility => {
      if (!this.reportOptions || includedFacilityIds.includes(facility.guid)) {
        let electricity: UtilityItem = { energyUse: 0, energyCost: 0, scope1LocationEmissions: 0, scope1MarketEmissions: 0, scope2LocationEmissions: 0, scope2MarketEmissions: 0 };
        let naturalGas: UtilityItem = { energyUse: 0, energyCost: 0, scope1LocationEmissions: 0, scope1MarketEmissions: 0, scope2LocationEmissions: 0, scope2MarketEmissions: 0 };
        let otherFuels: UtilityItem = { energyUse: 0, energyCost: 0, scope1LocationEmissions: 0, scope1MarketEmissions: 0, scope2LocationEmissions: 0, scope2MarketEmissions: 0 };
        let otherEnergy: UtilityItem = { energyUse: 0, energyCost: 0, scope1LocationEmissions: 0, scope1MarketEmissions: 0, scope2LocationEmissions: 0, scope2MarketEmissions: 0 };
        let water: UtilityItem = { energyUse: 0, energyCost: 0, scope1LocationEmissions: 0, scope1MarketEmissions: 0, scope2LocationEmissions: 0, scope2MarketEmissions: 0 };
        let wasteWater: UtilityItem = { energyUse: 0, energyCost: 0, scope1LocationEmissions: 0, scope1MarketEmissions: 0, scope2LocationEmissions: 0, scope2MarketEmissions: 0 };
        let otherUtility: UtilityItem = { energyUse: 0, energyCost: 0, scope1LocationEmissions: 0, scope1MarketEmissions: 0, scope2LocationEmissions: 0, scope2MarketEmissions: 0 };

        let facilityMeters: Array<CalanderizedMeter> = this.calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
        facilityMeters.forEach(cMeter => {
          cMeter.monthlyData.forEach(dataItem => {
            if (dataItem.date >= this.dateRange.startDate && dataItem.date <= this.dateRange.endDate) {
              if (cMeter.meter.source == 'Electricity') {
                if (cMeter.meter.scope == 1 || cMeter.meter.scope == 2) {
                  electricity.scope1MarketEmissions = (electricity.scope1MarketEmissions + Number(dataItem.marketEmissions));
                  electricity.scope1LocationEmissions = (electricity.scope1LocationEmissions + Number(dataItem.locationEmissions));
                } else if (cMeter.meter.scope == 3 || cMeter.meter.scope == 4) {
                  electricity.scope2MarketEmissions = (electricity.scope2MarketEmissions + Number(dataItem.marketEmissions));
                  electricity.scope2LocationEmissions = (electricity.scope2LocationEmissions + Number(dataItem.locationEmissions));
                }
                electricity.energyUse = (electricity.energyUse + Number(dataItem.energyUse));
                electricity.energyCost = (electricity.energyCost + Number(dataItem.energyCost));
              }
              else if (cMeter.meter.source == 'Natural Gas') {
                if (cMeter.meter.scope == 1 || cMeter.meter.scope == 2) {
                  naturalGas.scope1MarketEmissions = (naturalGas.scope1MarketEmissions + Number(dataItem.marketEmissions));
                  naturalGas.scope1LocationEmissions = (naturalGas.scope1LocationEmissions + Number(dataItem.locationEmissions));
                } else if (cMeter.meter.scope == 3 || cMeter.meter.scope == 4) {
                  naturalGas.scope2MarketEmissions = (naturalGas.scope2MarketEmissions + Number(dataItem.marketEmissions));
                  naturalGas.scope2LocationEmissions = (naturalGas.scope2LocationEmissions + Number(dataItem.locationEmissions));
                }
                naturalGas.energyUse = (naturalGas.energyUse + Number(dataItem.energyUse));
                naturalGas.energyCost = (naturalGas.energyCost + Number(dataItem.energyCost));
              }
              else if (cMeter.meter.source == 'Other Fuels') {
                if (cMeter.meter.scope == 1 || cMeter.meter.scope == 2) {
                  otherFuels.scope1MarketEmissions = (otherFuels.scope1MarketEmissions + Number(dataItem.marketEmissions));
                  otherFuels.scope1LocationEmissions = (otherFuels.scope1LocationEmissions + Number(dataItem.locationEmissions));
                } else if (cMeter.meter.scope == 3 || cMeter.meter.scope == 4) {
                  otherFuels.scope2MarketEmissions = (otherFuels.scope2MarketEmissions + Number(dataItem.marketEmissions));
                  otherFuels.scope2LocationEmissions = (otherFuels.scope2LocationEmissions + Number(dataItem.locationEmissions));
                }
                otherFuels.energyUse = (otherFuels.energyUse + Number(dataItem.energyUse));
                otherFuels.energyCost = (otherFuels.energyCost + Number(dataItem.energyCost));
              }
              else if (cMeter.meter.source == 'Other Energy') {
                if (cMeter.meter.scope == 1 || cMeter.meter.scope == 2) {
                  otherEnergy.scope1MarketEmissions = (otherEnergy.scope1MarketEmissions + Number(dataItem.marketEmissions));
                  otherEnergy.scope1LocationEmissions = (otherEnergy.scope1LocationEmissions + Number(dataItem.locationEmissions));
                } else if (cMeter.meter.scope == 3 || cMeter.meter.scope == 4) {
                  otherEnergy.scope2MarketEmissions = (otherEnergy.scope2MarketEmissions + Number(dataItem.marketEmissions));
                  otherEnergy.scope2LocationEmissions = (otherEnergy.scope2LocationEmissions + Number(dataItem.locationEmissions));
                }
                otherEnergy.energyUse = (otherEnergy.energyUse + Number(dataItem.energyUse));
                otherEnergy.energyCost = (otherEnergy.energyCost + Number(dataItem.energyCost));
              }
              else if (cMeter.meter.source == 'Water Intake') {
                water.energyUse = (water.energyUse + Number(dataItem.energyConsumption));
                water.energyCost = (water.energyCost + Number(dataItem.energyCost));
              }
              else if (cMeter.meter.source == 'Water Discharge') {
                wasteWater.energyUse = (wasteWater.energyUse + Number(dataItem.energyConsumption));
                wasteWater.energyCost = (wasteWater.energyCost + Number(dataItem.energyCost));
              }
              else if (cMeter.meter.source == 'Other Utility') {
                otherUtility.energyUse = (otherUtility.energyUse + Number(dataItem.energyUse));
                otherUtility.energyCost = (otherUtility.energyCost + Number(dataItem.energyCost));
              }
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
            wasteWater: wasteWater,
            water: water,
            otherUtility: otherUtility
          });
        }
      }
    });
    if (this.dataType == 'cost') {
      this.barChartData = _.orderBy(this.barChartData, (data) => {
        return (data.electricity.energyCost + data.naturalGas.energyCost + data.otherFuels.energyCost + data.otherEnergy.energyCost + data.water.energyCost + data.wasteWater.energyCost + data.otherUtility.energyCost);
      }, 'desc');
    } else if (this.dataType == 'emissions') {
      this.barChartData = _.orderBy(this.barChartData, (data) => {
        return (data.electricity.scope2LocationEmissions + data.naturalGas.scope2LocationEmissions + data.otherFuels.scope2LocationEmissions + data.otherEnergy.scope2LocationEmissions +
          data.electricity.scope1LocationEmissions + data.naturalGas.scope1LocationEmissions + data.otherFuels.scope1LocationEmissions + data.otherEnergy.scope1LocationEmissions);
      }, 'desc');
    } else if (this.dataType == 'energyUse') {
      this.barChartData = _.orderBy(this.barChartData, (data) => {
        return (data.electricity.energyUse + data.naturalGas.energyUse + data.otherFuels.energyUse + data.otherEnergy.energyUse);
      }, 'desc');
    } else if (this.dataType == 'water') {
      this.barChartData = _.orderBy(this.barChartData, (data) => {
        return (data.water.energyUse + data.wasteWater.energyUse);
      }, 'desc');
    }
  }

  getYAxisTitle(): string {
    if (this.dataType == 'energyUse') {
      return "Utility Usage (" + this.energyUnit + ")";
    } else if (this.dataType == 'cost') {
      return "Utility Costs";
    } else if (this.dataType == 'emissions') {
      if(this.emissionsDisplay == 'location'){
        return "Location Emissions (tonne CO<sub>2</sub>)";
      }else{
        return "Market Emissions (tonne CO<sub>2</sub>)";
      }
    } else if (this.dataType == 'water') {
      return "Water Usage (" + this.waterUnit + ")"
    }
  }

  getTickPrefix(): string {
    if (this.dataType == 'cost') {
      return "$";
    }
    return;
  }

  getEmissionsTraceColor(scope: 1 | 2): string {
    if (this.emissionsDisplay == 'market') {
      if (scope == 1) {
        //Scope 1
        return '#95A5A6';
      } else if (scope == 2) {
        //Scope 2
        return '#273746';
      }
    } else {
      if (scope == 1) {
        //Scope 1
        return '#873600';
      } else if (scope == 2) {
        //Scope 2
        return '#B9770E';
      }
    }
  }

}

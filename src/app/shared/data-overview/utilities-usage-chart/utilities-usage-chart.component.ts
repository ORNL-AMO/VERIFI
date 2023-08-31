import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { AnnualSourceData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { EnergySources, WaterSources } from 'src/app/models/constantsAndTypes';
import { ScopeOption, ScopeOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';

@Component({
  selector: 'app-utilities-usage-chart',
  templateUrl: './utilities-usage-chart.component.html',
  styleUrls: ['./utilities-usage-chart.component.css']
})
export class UtilitiesUsageChartComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facilityId: string;
  @Input()
  annualSourceData: Array<AnnualSourceData>;

  @ViewChild('utilityBarChart', { static: false }) utilityBarChart: ElementRef;

  // emissionsDisplay: 'market' | 'location';
  // emissionsDisplaySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = facilities.find(facility => { return facility.guid == this.facilityId });

    // if (this.dataType == 'emissions') {
    //   this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
    //     this.emissionsDisplay = val;
    //     this.drawChart();
    //   });
    // } else {
    //   this.drawChart();
    // }
  }

  ngOnDestroy() {
    // this.monthlySourceDataSub.unsubscribe();
    // if (this.emissionsDisplaySub) {
    //   this.emissionsDisplaySub.unsubscribe();
    // }
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && (changes.annualSourceData && !changes.annualSourceData.isFirstChange())) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.utilityBarChart && this.annualSourceData && this.annualSourceData.length != 0) {
      let traceData = new Array();


      let hoverformat: string = ",.2f";
      if (this.dataType == 'cost') {
        hoverformat = "$,.2f";
      }
      let tickprefix: string = "";

      this.annualSourceData.forEach(sourceData => {
        let includeData: boolean = this.checkIncludeData(sourceData);
        if (includeData) {
          let years: Array<number> = sourceData.annualSourceDataItems.map(d => { return d.fiscalYear });
          years = _.uniq(years)
          let yValues: Array<number> = new Array();
          if (this.dataType != 'emissions') {
            if (this.dataType == 'cost') {
              yValues = sourceData.annualSourceDataItems.map(data => { return data.totalCost });
            } else if (this.dataType == 'energyUse') {
              yValues = sourceData.annualSourceDataItems.map(data => { return data.totalEnergyUsage });
            } else if (this.dataType == 'water') {
              yValues = sourceData.annualSourceDataItems.map(data => { return data.totalConsumption });
            }
            let trace = {
              x: years,
              y: yValues,
              name: this.getName(sourceData),
              type: 'bar',
              marker: {
                color: this.getTraceColor(sourceData),
              }
            }
            traceData.push(trace);
          } else {
            let marketTrace = {
              x: years,
              y: sourceData.annualSourceDataItems.map(data => { return data.totalMarketEmissions }),
              name: this.getName(sourceData) + ' Market',
              type: 'bar',
              marker: {
                color: this.getTraceColor(sourceData, 'market'),
              }
            }
            traceData.push(marketTrace);
            let locationTrace = {
              x: years,
              y: sourceData.annualSourceDataItems.map(data => { return data.totalLocationEmissions }),
              name: this.getName(sourceData) + ' Location',
              type: 'bar',
              marker: {
                color: this.getTraceColor(sourceData, 'location'),
              }
            }
            traceData.push(locationTrace);
          }
        }
      })

      let xAxisTitle: string = 'Year';
      if (this.selectedFacility.fiscalYear == 'nonCalendarYear') {
        xAxisTitle = 'Fiscal Year';
      }

      var layout = {
        barmode: 'group',
        xaxis: {
          title: {
            text: xAxisTitle
          }
        },
        yaxis: {
          title: {
            text: this.getYAxisTitle(),
            tickprefix: tickprefix
          },
          hoverformat: hoverformat
        },
        margin: { r: 0, t: 50 }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };

      this.plotlyService.newPlot(this.utilityBarChart.nativeElement, traceData, layout, config);
    }
  }

  getYAxisTitle(): string {
    if (this.dataType == 'energyUse') {
      return "Utility Usage (" + this.selectedFacility.energyUnit + ")";
    } else if (this.dataType == 'emissions') {
      return "Utility Emissions (tonne CO<sub>2</sub>e)";
    } else if (this.dataType == 'water') {
      return "Utility Usage (" + this.selectedFacility.volumeLiquidUnit + ")";
    } else if (this.dataType == 'cost') {
      return "Utility Costs";
    }
  }

  checkIncludeData(sourceData: AnnualSourceData): boolean {
    if (this.dataType == 'cost' || this.dataType == 'emissions') {
      return true;
    } else if (this.dataType == 'energyUse') {
      return EnergySources.includes(sourceData.source);
    } else if (this.dataType == 'water') {
      return WaterSources.includes(sourceData.source);
    }
  }


  getTraceColor(sourceData: AnnualSourceData, emissionsType?: 'market' | 'location'): string {
    if (this.dataType != 'emissions') {
      return UtilityColors[sourceData.source].color
    } else {
      if (emissionsType == 'market') {
        if (sourceData.scope == 1 || sourceData.scope == 2) {
          //Scope 1
          return '#95A5A6';
        } else if (sourceData.scope == 3 || sourceData.scope == 4) {
          //Scope 2
          return '#273746';
        }
      } else {
        if (sourceData.scope == 1 || sourceData.scope == 2) {
          //Scope 1
          return '#873600';
        } else if (sourceData.scope == 3 || sourceData.scope == 4) {
          //Scope 2
          return '#B9770E';
        }
      }
    }
  }

  getName(sourceData: AnnualSourceData): string {
    if (this.dataType != 'emissions') {
      return sourceData.source;
    } else {
      let scopeOption: ScopeOption = ScopeOptions.find(option => {
        return option.value == sourceData.scope;
      });
      return scopeOption.scope;
    }

  }
}

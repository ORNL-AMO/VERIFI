import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import * as _ from 'lodash';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { AnnualSourceData, AnnualSourceDataItem } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { EmissionsTypes, getEmissionsTypeColor, getEmissionsTypes } from 'src/app/models/eGridEmissions';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-emissions-usage-chart',
    templateUrl: './emissions-usage-chart.component.html',
    styleUrls: ['./emissions-usage-chart.component.css'],
    standalone: false
})
export class EmissionsUsageChartComponent {
  @Input()
  facilityId: string;
  @Input()
  annualSourceData: Array<AnnualSourceData>;

  @ViewChild('utilityBarChart', { static: false }) utilityBarChart: ElementRef;

  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = facilities.find(facility => { return facility.guid == this.facilityId });

    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.drawChart();
    });
  }

  ngOnDestroy() {
    this.emissionsDisplaySub.unsubscribe();
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

      let tickprefix: string = "";

      let annualSourceDataItems: Array<AnnualSourceDataItem> = this.annualSourceData.flatMap(sData => {
        return sData.annualSourceDataItems;
      });
      let years: Array<number> = annualSourceDataItems.map(d => { return d.fiscalYear });
      years = _.uniq(years);
      let emissionsTypes: Array<EmissionsTypes> = getEmissionsTypes(this.emissionsDisplay);
      emissionsTypes.forEach(eType => {
        let yValues: Array<number> = new Array();
        years.forEach(year => {
          let yearData: Array<AnnualSourceDataItem> = annualSourceDataItems.filter(sData => {
            return sData.fiscalYear == year;
          });
          let total: number;
          if (eType == 'Scope 1: Fugitive') {
            total = _.sumBy(yearData, (dataItem: AnnualSourceDataItem) => {
              return dataItem.totalEmissions.fugitiveEmissions
            });
          } else if (eType == 'Scope 2: Electricity (Location)') {
            total = _.sumBy(yearData, (dataItem: AnnualSourceDataItem) => {
              return dataItem.totalEmissions.locationElectricityEmissions;
            });
          } else if (eType == 'Scope 2: Electricity (Market)') {
            total = _.sumBy(yearData, (dataItem: AnnualSourceDataItem) => {
              return dataItem.totalEmissions.marketElectricityEmissions;
            });
          } else if (eType == 'Scope 1: Mobile') {
            total = _.sumBy(yearData, (dataItem: AnnualSourceDataItem) => {
              return dataItem.totalEmissions.mobileTotalEmissions
            });
          } else if (eType == 'Scope 1: Process') {
            total = _.sumBy(yearData, (dataItem: AnnualSourceDataItem) => {
              return dataItem.totalEmissions.processEmissions
            });
          } else if (eType == 'Scope 1: Stationary') {
            total = _.sumBy(yearData, (dataItem: AnnualSourceDataItem) => {
              return dataItem.totalEmissions.stationaryEmissions;
            });
          } else if (eType == 'Scope 2: Other') {
            total = _.sumBy(yearData, (dataItem: AnnualSourceDataItem) => {
              return dataItem.totalEmissions.otherScope2Emissions;
            });
          }
          if(total != undefined){
            yValues.push(total);
          }
        });
        if (yValues.findIndex(y => { return y != 0 }) != -1) {
          let trace = {
            x: years,
            y: yValues,
            name: eType,
            type: 'bar',
            marker: {
              color: getEmissionsTypeColor(eType),
            }
          }
          traceData.push(trace);
        }
      });

      traceData = _.orderBy(traceData, (tData) => {
        return _.sum(tData.y);
      }, 'desc');

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
            text: "Utility Emissions (tonne CO<sub>2</sub>e)",
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
}

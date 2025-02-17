import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import * as _ from 'lodash';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { AnnualSourceData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { EnergySources, WaterSources } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-utilities-usage-chart',
    templateUrl: './utilities-usage-chart.component.html',
    styleUrls: ['./utilities-usage-chart.component.css'],
    standalone: false
})
export class UtilitiesUsageChartComponent {
  @Input()
  dataType: 'energyUse' | 'cost' | 'water';
  @Input()
  facilityId: string;
  @Input()
  annualSourceData: Array<AnnualSourceData>;

  @ViewChild('utilityBarChart', { static: false }) utilityBarChart: ElementRef;
  selectedFacility: IdbFacility;
  constructor(private plotlyService: PlotlyService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = facilities.find(facility => { return facility.guid == this.facilityId });
    this.drawChart();
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
            name: sourceData.source,
            type: 'bar',
            marker: {
              color: UtilityColors[sourceData.source].color,
            }
          }
          traceData.push(trace);
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
    } else if (this.dataType == 'water') {
      return "Utility Usage (" + this.selectedFacility.volumeLiquidUnit + ")";
    } else if (this.dataType == 'cost') {
      return "Utility Costs";
    }
  }

  checkIncludeData(sourceData: AnnualSourceData): boolean {
    if (this.dataType == 'cost') {
      return true;
    } else if (this.dataType == 'energyUse') {
      return EnergySources.includes(sourceData.source);
    } else if (this.dataType == 'water') {
      return WaterSources.includes(sourceData.source);
    }
  }
}

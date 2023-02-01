import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import * as _ from 'lodash';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';

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
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;

  @ViewChild('utilityBarChart', { static: false }) utilityBarChart: ElementRef;

  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = facilities.find(facility => { return facility.guid == this.facilityId });

    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        this.drawChart();
      });
    } else {
      this.drawChart();
    }
  }

  ngOnDestroy() {
    // this.monthlySourceDataSub.unsubscribe();
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && !changes.monthlySourceData.isFirstChange()) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.utilityBarChart && this.monthlySourceData && this.monthlySourceData.length != 0) {
      let traceData = new Array();


      let hoverformat: string = ",.2f";
      if (this.dataType == 'cost') {
        hoverformat = "$,.2f";
      }
      let tickprefix: string = "";

      this.monthlySourceData.forEach(dataItem => {
        let years: Array<number> = dataItem.data.map(d => { return d.fiscalYear });
        years = _.uniq(years)
        let yValues: Array<number> = new Array();
        years.forEach(year => {
          let dataValue: number = 0;
          dataItem.data.forEach(d => {
            if (d.fiscalYear == year) {
              if (this.dataType == 'cost') {
                dataValue += d.energyCost;
              } else if (this.dataType == 'emissions') {
                if (this.emissionsDisplay == 'market') {
                  dataValue += d.marketEmissions;
                } else {
                  dataValue += d.locationEmissions;
                }
              } else if (this.dataType == 'energyUse') {
                dataValue += d.energyUse;
              } else if (this.dataType == 'water') {
                dataValue += d.consumption;
              }
            }
          });
          yValues.push(dataValue);
        });
        let trace = {
          x: years,
          y: yValues,
          name: dataItem.source,
          type: 'bar',
          marker: {
            color: UtilityColors[dataItem.source].color,
          }
        }
        traceData.push(trace);
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
      return "Utility Emissions (kg CO<sub>2</sub>e)";
    } else if (this.dataType == 'water') {
      return "Utility Usage (" + this.selectedFacility.volumeLiquidUnit + ")";
    } else if (this.dataType == 'cost') {
      return "Utility Costs";
    }
  }
}

import { Component, ElementRef, ViewChild, Input } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, MeterSource } from 'src/app/models/idb';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { FacilityBarChartData } from 'src/app/models/visualization';

@Component({
  selector: 'app-meters-overview-stacked-line-chart',
  templateUrl: './meters-overview-stacked-line-chart.component.html',
  styleUrls: ['./meters-overview-stacked-line-chart.component.css']
})
export class MetersOverviewStackedLineChartComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facilityId: string;

  @ViewChild('stackedAreaChart', { static: false }) stackedAreaChart: ElementRef;

  monthlySourceDataSub: Subscription;
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>
  selectedFacility: IdbFacility;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = facilities.find(facility => { return facility.guid == this.facilityId });

    if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
      this.monthlySourceDataSub = this.facilityOverviewService.energyMonthlySourceData.subscribe(sourceData => {
        this.monthlySourceData = sourceData;
        if (this.dataType == 'energyUse') {
          this.drawChart();
        } else if (this.dataType == 'emissions' && this.emissionsDisplay) {
          this.drawChart();
        }
      });
    } else if (this.dataType == 'cost') {
      this.monthlySourceDataSub = this.facilityOverviewService.costsMonthlySourceData.subscribe(sourceData => {
        this.monthlySourceData = sourceData;
        this.drawChart();
      });
    } else if (this.dataType == 'water') {
      this.monthlySourceDataSub = this.facilityOverviewService.waterMonthlySourceData.subscribe(sourceData => {
        this.monthlySourceData = sourceData;
        this.drawChart();
      });
    }
    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        this.drawChart();
      });
    }
  }

  ngOnDestroy() {
    this.monthlySourceDataSub.unsubscribe();
    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.stackedAreaChart && this.monthlySourceData && this.monthlySourceData.length != 0) {
      let traceData = new Array();
      this.facilityOverviewService.calanderizedMeters = _.orderBy(this.facilityOverviewService.calanderizedMeters, (cMeter) => { return cMeter.meter.source });
      let dataPointSize: number = 0;
      this.facilityOverviewService.calanderizedMeters.forEach(cMeter => {
        let x: Array<string> = new Array();
        let y: Array<number> = new Array();
        if (dataPointSize < cMeter.monthlyData.length - 1) {
          dataPointSize = cMeter.monthlyData.length - 1;
        }
        cMeter.monthlyData.forEach(dataItem => {
          x.push(dataItem.month + ', ' + dataItem.year);
          if (this.dataType == 'energyUse') {
            y.push(dataItem.energyUse);
          } else if (this.dataType == 'cost') {
            y.push(dataItem.energyCost);
          } else if (this.dataType == 'emissions') {
            if (this.emissionsDisplay == 'location') {
              y.push(dataItem.locationEmissions);
            } else {
              y.push(dataItem.marketEmissions);
            }
          } else if (this.dataType == 'water') {
            y.push(dataItem.energyConsumption);
          }
        })
        let trace = {
          x: x,
          y: y,
          name: cMeter.meter.name,
          text: cMeter.monthlyData.map(item => { return cMeter.meter.name }),
          stackgroup: 'one',
          marker: {
            color: UtilityColors[cMeter.meter.source].color,
          },
          hovertemplate: this.getHoverTemplate(),
        }
        traceData.push(trace);
      })

      let xrange;
      if (dataPointSize >= 11) {
        xrange = [dataPointSize - 11, dataPointSize];
      };

      var layout = {
        barmode: 'group',
        title: {
          text: this.getYAxisTitle(),
          font: {
            size: 24
          },
        },
        xaxis: {
          autotick: false,
          range: xrange
        },
        yaxis: {
          title: {
            tickprefix: ""
          },
          hoverformat: ",.2f"
        },
        legend: {
          orientation: 'h'
        }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.stackedAreaChart.nativeElement, traceData, layout, config);
    }
  }

  getYAxisTitle(): string {
    if (this.dataType == 'energyUse') {
      return "Utility Usage (" + this.selectedFacility.energyUnit + ")";
    } else if (this.dataType == 'emissions') {
      return "Utility Emissions (kg CO<sub>2</sub>e)";
    } else if (this.dataType == 'cost') {
      return "Utility Costs";
    } else if (this.dataType == 'water') {
      return "Water Usage (" + this.selectedFacility.volumeLiquidUnit + ")";
    }
  }

  getHoverTemplate(): string {
    if (this.dataType == 'energyUse') {
      return '%{text} (%{x}): %{y:,.0f} ' + this.selectedFacility.energyUnit + ' <extra></extra>';
    } else if (this.dataType == 'emissions') {
      return '%{text} (%{x}): %{y:,.0f} kg CO<sub>2</sub>e <extra></extra>';
    } else if (this.dataType == 'cost') {
      return '%{text} (%{x}): %{y:$,.0f} <extra></extra>';
    } else if (this.dataType == 'water') {
      return '%{text} (%{x}): %{y:,.0f} ' + this.selectedFacility.volumeLiquidUnit + ' <extra></extra>';
    }
  }
}

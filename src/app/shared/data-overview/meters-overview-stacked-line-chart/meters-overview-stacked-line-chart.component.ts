import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AllSources, EnergySources, IdbFacility, MeterSource, WaterSources } from 'src/app/models/idb';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { CalanderizedMeter } from 'src/app/models/calanderization';

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
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>

  @ViewChild('stackedAreaChart', { static: false }) stackedAreaChart: ElementRef;

  selectedFacility: IdbFacility;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
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
    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && (changes.monthlySourceData && !changes.monthlySourceData.isFirstChange())) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.stackedAreaChart && this.calanderizedMeters && this.calanderizedMeters.length != 0) {
      let traceData = new Array();
      this.calanderizedMeters = _.orderBy(this.calanderizedMeters, (cMeter) => { return cMeter.meter.source });
      let dataPointSize: number = 0;
      let includedSources: Array<MeterSource> = this.getIncludedSources();
      this.calanderizedMeters.forEach(cMeter => {
        if (includedSources.includes(cMeter.meter.source)) {
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
        }
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

  getIncludedSources(): Array<MeterSource> {
    if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
      return EnergySources;
    } else if (this.dataType == 'cost') {
      return AllSources;
    } else if (this.dataType == 'water') {
      return WaterSources;
    }
  }
}

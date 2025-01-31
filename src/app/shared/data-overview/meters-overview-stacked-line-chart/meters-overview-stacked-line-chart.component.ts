import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AllSources, EnergySources, MeterSource, WaterSources } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
    selector: 'app-meters-overview-stacked-line-chart',
    templateUrl: './meters-overview-stacked-line-chart.component.html',
    styleUrls: ['./meters-overview-stacked-line-chart.component.css'],
    standalone: false
})
export class MetersOverviewStackedLineChartComponent {
  @Input()
  dataType: 'energyUse' | 'cost' | 'water';
  @Input()
  facilityId: string;
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;
  @Input()
  dateRange: { startDate: Date, endDate: Date };

  @ViewChild('stackedAreaChart', { static: false }) stackedAreaChart: ElementRef;

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
    if (!changes.dataType && ((changes.calanderizedMeters && !changes.calanderizedMeters.isFirstChange()) || (changes.dateRange && !changes.dateRange.isFirstChange()))) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.stackedAreaChart && this.calanderizedMeters && this.calanderizedMeters.length != 0) {
      let traceData = new Array();
      this.calanderizedMeters = _.orderBy(this.calanderizedMeters, (cMeter) => { return cMeter.meter.source });
      // let dataPointSize: number = 0;
      this.calanderizedMeters.forEach(cMeter => {
        if (this.checkIncludeMeter(cMeter.meter)) {
          let x: Array<Date> = new Array();
          let y: Array<number> = new Array();
          // if (dataPointSize < cMeter.monthlyData.length - 1) {
          //   dataPointSize = cMeter.monthlyData.length - 1;
          // }
          let monthlyDataInRange: Array<MonthlyData> = cMeter.monthlyData.filter(dataItem => {
            let dataItemDate: Date = new Date(dataItem.date);
            return (dataItemDate >= this.dateRange.startDate) && (dataItemDate <= this.dateRange.endDate);
          });
          monthlyDataInRange.forEach(dataItem => {
            x.push(dataItem.date);
            if (this.dataType == 'energyUse') {
              y.push(dataItem.energyUse);
            } else if (this.dataType == 'cost') {
              y.push(dataItem.energyCost);
            } else if (this.dataType == 'water') {
              y.push(dataItem.energyConsumption);
            }
          })
          let trace = {
            x: x,
            y: y,
            name: cMeter.meter.name,
            text: monthlyDataInRange.map(item => { return cMeter.meter.name }),
            stackgroup: 'one',
            marker: {
              color: UtilityColors[cMeter.meter.source].color,
            },
            hovertemplate: this.getHoverTemplate(),
          }
          traceData.push(trace);
        }
      })

      // let xrange;
      // if (dataPointSize >= 11) {
      //   xrange = [dataPointSize - 11, dataPointSize];
      // };

      var layout = {
        barmode: 'group',
        title: {
          text: this.getYAxisTitle(),
          font: {
            size: 24
          },
        },
        xaxis: {
          // autotick: false,
          // range: xrange
          type: 'date'
        },
        yaxis: {
          title: {
            tickprefix: ""
          },
          hoverformat: ",.2f"
        },
        // legend: {
        //   orientation: 'h'
        // }
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
    } else if (this.dataType == 'cost') {
      return "Utility Costs";
    } else if (this.dataType == 'water') {
      return "Water Usage (" + this.selectedFacility.volumeLiquidUnit + ")";
    }
  }

  getHoverTemplate(): string {
    if (this.dataType == 'energyUse') {
      return '%{text} (%{x}): %{y:,.0f} ' + this.selectedFacility.energyUnit + ' <extra></extra>';
    } else if (this.dataType == 'cost') {
      return '%{text} (%{x}): %{y:$,.0f} <extra></extra>';
    } else if (this.dataType == 'water') {
      return '%{text} (%{x}): %{y:,.0f} ' + this.selectedFacility.volumeLiquidUnit + ' <extra></extra>';
    }
  }

  getIncludedSources(): Array<MeterSource> {
    if (this.dataType == 'energyUse') {
      return EnergySources;
    } else if (this.dataType == 'cost') {
      return AllSources;
    } else if (this.dataType == 'water') {
      return WaterSources;
    }
  }


  checkIncludeMeter(meter: IdbUtilityMeter): boolean {
    let includedSources: Array<MeterSource> = this.getIncludedSources();
    if (includedSources.includes(meter.source)) {
      if (this.dataType == 'energyUse') {
        return meter.includeInEnergy;
      } else {
        return true;
      }
    }
    return false;
  }
}

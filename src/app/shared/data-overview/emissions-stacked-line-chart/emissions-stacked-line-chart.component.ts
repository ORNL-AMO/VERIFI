import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { EmissionsTypes, getEmissionsTypeColor, getEmissionsTypes } from 'src/app/models/eGridEmissions';
import { Month, Months } from '../../form-data/months';

@Component({
  selector: 'app-emissions-stacked-line-chart',
  templateUrl: './emissions-stacked-line-chart.component.html',
  styleUrls: ['./emissions-stacked-line-chart.component.css']
})
export class EmissionsStackedLineChartComponent {
  @Input()
  facilityId: string;
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;
  @Input()
  dateRange: { startDate: Date, endDate: Date };

  @ViewChild('stackedAreaChart', { static: false }) stackedAreaChart: ElementRef;

  selectedFacility: IdbFacility;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
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
    if (!changes.dataType && ((changes.calanderizedMeters && !changes.calanderizedMeters.isFirstChange()) || (changes.dateRange && !changes.dateRange.isFirstChange()))) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.stackedAreaChart && this.calanderizedMeters && this.calanderizedMeters.length != 0) {
      let traceData = new Array();
      this.calanderizedMeters = _.orderBy(this.calanderizedMeters, (cMeter) => { return cMeter.meter.source });

      let allMonthlyData: Array<MonthlyData> = this.calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
      let monthlyDataInRange: Array<MonthlyData> = allMonthlyData.filter(dataItem => {
        let dataItemDate: Date = new Date(dataItem.date);
        return (dataItemDate >= this.dateRange.startDate) && (dataItemDate <= this.dateRange.endDate);
      });

      let emissionsTypes: Array<EmissionsTypes> = getEmissionsTypes(this.emissionsDisplay);
      emissionsTypes.forEach(emissionType => {
        let trace = this.getTraceData(emissionType, monthlyDataInRange);
        if (trace) {
          traceData.push(trace)
        }
      });

      // let xrange;
      // if (dataPointSize >= 11) {
      //   xrange = [dataPointSize - 11, dataPointSize];
      // };

      var layout = {
        barmode: 'group',
        title: {
          text: "Utility Emissions (tonne CO<sub>2</sub>e)",
          font: {
            size: 24
          },
        },
        xaxis: {
          // autotick: false,
          // range: xrange
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

  getTraceData(emissionsType: EmissionsTypes, monthlyDataInRange: Array<MonthlyData>) {
    let x: Array<string> = new Array();
    let y: Array<number> = new Array();
    let startDate: Date = new Date(this.dateRange.startDate);
    let endDate: Date = new Date(this.dateRange.endDate);
    while (startDate < endDate) {
      let currentMonthsData: Array<MonthlyData> = monthlyDataInRange.filter(mData => {
        return mData.monthNumValue == startDate.getMonth() && mData.year == startDate.getFullYear()
      });
      let month: Month = Months.find(month => {
        return month.monthNumValue == startDate.getMonth();
      })
      x.push(month.abbreviation + ', ' + startDate.getFullYear());
      let total: number;
      if (emissionsType == 'Scope 1: Fugitive') {
        total = _.sumBy(currentMonthsData, (mData: MonthlyData) => {
          return mData.fugitiveEmissions
        });
      } else if (emissionsType == 'Scope 2: Electricity (Location)') {
        total = _.sumBy(currentMonthsData, (mData: MonthlyData) => {
          return mData.locationElectricityEmissions;
        });
      } else if (emissionsType == 'Scope 2: Electricity (Market)') {
        total = _.sumBy(currentMonthsData, (mData: MonthlyData) => {
          return mData.marketElectricityEmissions
        });
      } else if (emissionsType == 'Scope 1: Mobile') {
        total = _.sumBy(currentMonthsData, (mData: MonthlyData) => {
          return mData.mobileTotalEmissions
        });
      } else if (emissionsType == 'Scope 1: Process') {
        total = _.sumBy(currentMonthsData, (mData: MonthlyData) => {
          return mData.processEmissions
        });
      } else if (emissionsType == 'Scope 1: Stationary') {
        total = _.sumBy(currentMonthsData, (mData: MonthlyData) => {
          return mData.stationaryEmissions;
        });
      } else if (emissionsType == 'Scope 2: Other') {
        total = _.sumBy(currentMonthsData, (mData: MonthlyData) => {
          return mData.otherScope2Emissions;
        });
      }
      if (total) {
        y.push(total);
      }
      startDate.setMonth(startDate.getMonth() + 1);
    }
    if (y.findIndex(item => { return item != 0 }) != -1) {
      let trace = {
        x: x,
        y: y,
        name: emissionsType,
        text: x.map(item => { return emissionsType }),
        stackgroup: 'one',
        marker: {
          color: getEmissionsTypeColor(emissionsType),
        },
        hovertemplate: '%{text} (%{x}): %{y:,.0f} tonne CO<sub>2</sub>e <extra></extra>',
      }
      return trace;
    }
    return
  }

}

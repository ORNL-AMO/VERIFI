import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { FacilityOverviewService } from '../../facility-overview.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-emissions-meters-usage-chart',
  templateUrl: './emissions-meters-usage-chart.component.html',
  styleUrls: ['./emissions-meters-usage-chart.component.css']
})
export class EmissionsMetersUsageChartComponent implements OnInit {
  @ViewChild('stackedAreaChart', { static: false }) stackedAreaChart: ElementRef;

  monthlySourceDataSub: Subscription;
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.drawChart();
    });

    this.monthlySourceDataSub = this.facilityOverviewService.energyMonthlySourceData.subscribe(sourceData => {
      this.monthlySourceData = sourceData;
      this.drawChart();
    });
  }

  ngOnDestroy() {
    this.monthlySourceDataSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.stackedAreaChart && this.monthlySourceData && this.monthlySourceData.length != 0 && this.emissionsDisplay) {
      let traceData = new Array();
      let yaxisTitle: string = "Utility Emissions (kg CO<sub>2</sub>e)";
      let tickprefix: string = "";
      let hoverformat: string = ",.2f";
      let hovertemplate: string = '%{text} (%{x}): %{y:,.0f} kg CO<sub>2</sub>e <extra></extra>'
      this.facilityOverviewService.calanderizedMeters = _.orderBy(this.facilityOverviewService.calanderizedMeters, (cMeter) => { return cMeter.meter.source });

      let dataPointSize: number = 0;
      this.facilityOverviewService.calanderizedMeters.forEach(cMeter => {
        if (cMeter.meter.source == 'Electricity' || cMeter.meter.source == 'Natural Gas' || cMeter.meter.source == 'Other Energy' || cMeter.meter.source == "Other Fuels") {
          let x: Array<string> = new Array();
          let y: Array<number> = new Array();
          if (dataPointSize < cMeter.monthlyData.length - 1) {
            dataPointSize = cMeter.monthlyData.length - 1;
          }
          cMeter.monthlyData.forEach(dataItem => {
            x.push(dataItem.month + ', ' + dataItem.year);
            if (this.emissionsDisplay == 'location') {
              y.push(dataItem.locationEmissions);
            } else {
              y.push(dataItem.marketEmissions);
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
            hovertemplate: hovertemplate,
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
          text: yaxisTitle,
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
            tickprefix: tickprefix
          },
          hoverformat: hoverformat
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

}

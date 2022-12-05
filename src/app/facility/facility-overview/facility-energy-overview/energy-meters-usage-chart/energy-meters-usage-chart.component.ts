import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { FacilityOverviewService } from '../../facility-overview.service';
import * as _ from 'lodash';
@Component({
  selector: 'app-energy-meters-usage-chart',
  templateUrl: './energy-meters-usage-chart.component.html',
  styleUrls: ['./energy-meters-usage-chart.component.css']
})
export class EnergyMetersUsageChartComponent implements OnInit {
  @ViewChild('stackedAreaChart', { static: false }) stackedAreaChart: ElementRef;

  monthlySourceDataSub: Subscription;
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
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
    if (this.stackedAreaChart && this.monthlySourceData && this.monthlySourceData.length != 0) {
      let traceData = new Array();
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let yaxisTitle: string = "Utility Usage (" + selectedFacility.energyUnit + ")";
      let tickprefix: string = "";
      let hoverformat: string = ",.2f";
      let hovertemplate: string = '%{text} (%{x}): %{y:,.0f} ' + selectedFacility.energyUnit + ' <extra></extra>'
      this.facilityOverviewService.calanderizedMeters = _.orderBy(this.facilityOverviewService.calanderizedMeters, (cMeter) => { return cMeter.meter.source });

      let dataPointSize: number = 0;
      this.facilityOverviewService.calanderizedMeters.forEach(cMeter => {
        if (cMeter.meter.source == 'Electricity' || cMeter.meter.source == 'Natural Gas' || cMeter.meter.source == 'Other Energy'|| cMeter.meter.source ==  "Other Fuels") {
          let x: Array<string> = new Array();
          let y: Array<number> = new Array();
          if(dataPointSize < cMeter.monthlyData.length-1){
            dataPointSize = cMeter.monthlyData.length-1;
          }
          cMeter.monthlyData.forEach(dataItem => {
            x.push(dataItem.month + ', ' + dataItem.year);
            y.push(dataItem.energyUse);
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
      if(dataPointSize >= 11){
        xrange = [dataPointSize-11, dataPointSize];
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

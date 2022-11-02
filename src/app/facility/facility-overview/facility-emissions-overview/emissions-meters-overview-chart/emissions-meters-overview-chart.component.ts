import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { Subscription } from 'rxjs';
import { FacilityOverviewService } from '../../facility-overview.service';
import { UtilityColors } from 'src/app/shared/utilityColors';
import * as _ from 'lodash';

@Component({
  selector: 'app-emissions-meters-overview-chart',
  templateUrl: './emissions-meters-overview-chart.component.html',
  styleUrls: ['./emissions-meters-overview-chart.component.css']
})
export class EmissionsMetersOverviewChartComponent implements OnInit {

  @ViewChild('emissionsDonut', { static: false }) emissionsDonut: ElementRef;
  metersSummary: FacilityMeterSummaryData;
  metersSummarySub: Subscription;

  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.drawChart();
    });

    this.metersSummarySub = this.facilityOverviewService.energyMeterSummaryData.subscribe(metersSummary => {
      this.metersSummary = metersSummary;
      this.drawChart();
    });
  }

  ngOnDestroy() {
    this.metersSummarySub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.emissionsDonut && this.metersSummary && this.emissionsDisplay) {
      let hovertemplate: string = '%{label}: %{value:,.0f} kg CO<sub>2</sub> <extra></extra>'

      this.metersSummary.meterSummaries = _.orderBy(this.metersSummary.meterSummaries, (summary) => { return summary.meter.source });

      let values: Array<number>;
      if(this.emissionsDisplay == 'location'){
        values = this.metersSummary.meterSummaries.map(summary => { return summary.locationEmissions });
      }else{
        values = this.metersSummary.meterSummaries.map(summary => { return summary.marketEmissions });
      }

      var data = [{
        values: values,
        labels: this.metersSummary.meterSummaries.map(summary => { return summary.meter.name }),
        marker: {
          colors: this.metersSummary.meterSummaries.map(summary => { return UtilityColors[summary.meter.source].color }),
          line: {
            color: '#fff',
            width: 5
          }
        },
        textinfo: 'label+percent',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        hovertemplate: hovertemplate,
        hole: .6,
        type: 'pie',
        automargin: true,
        sort: false
      }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
        showlegend: false
      };

      let config = {
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.emissionsDonut.nativeElement, data, layout, config);
    }
  }

}

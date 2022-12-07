import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { Subscription } from 'rxjs';
import { FacilityOverviewService } from '../../facility-overview.service';
import { UtilityColors } from 'src/app/shared/utilityColors';
import * as _ from 'lodash';

@Component({
  selector: 'app-cost-meters-overview-chart',
  templateUrl: './cost-meters-overview-chart.component.html',
  styleUrls: ['./cost-meters-overview-chart.component.css']
})
export class CostMetersOverviewChartComponent implements OnInit {

  @ViewChild('energyCostDonut', { static: false }) energyCostDonut: ElementRef;
  metersSummary: FacilityMeterSummaryData;
  metersSummarySub: Subscription;

  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.metersSummarySub = this.facilityOverviewService.energyMeterSummaryData.subscribe(metersSummary => {
      this.metersSummary = metersSummary;
      this.drawChart();
    });
  }

  ngOnDestroy() {
    this.metersSummarySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.energyCostDonut && this.metersSummary) {
      let hovertemplate: string = '%{label}: %{value:$,.0f} <extra></extra>'

      this.metersSummary.meterSummaries = _.orderBy(this.metersSummary.meterSummaries, (summary) => { return summary.meter.source });

      var data = [{
        values: this.metersSummary.meterSummaries.map(summary => { return summary.energyCost }),
        labels: this.metersSummary.meterSummaries.map(summary => { return summary.meter.name }),
        marker: {
          colors: this.metersSummary.meterSummaries.map(summary => { return UtilityColors[summary.meter.source].color }),
          line: {
            color: '#fff',
            width: 5
          }
        },
        texttemplate: '%{label}: (%{percent:.1%})',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        hovertemplate: hovertemplate,
        hole: .5,
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
      this.plotlyService.newPlot(this.energyCostDonut.nativeElement, data, layout, config);
    }
  }
}

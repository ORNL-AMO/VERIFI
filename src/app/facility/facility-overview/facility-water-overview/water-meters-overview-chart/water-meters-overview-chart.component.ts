import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { FacilityOverviewService } from '../../facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityColors } from 'src/app/shared/utilityColors';
import * as _ from 'lodash';

@Component({
  selector: 'app-water-meters-overview-chart',
  templateUrl: './water-meters-overview-chart.component.html',
  styleUrls: ['./water-meters-overview-chart.component.css']
})
export class WaterMetersOverviewChartComponent implements OnInit {


  @ViewChild('waterDonut', { static: false }) waterDonut: ElementRef;
  metersSummary: FacilityMeterSummaryData;
  metersSummarySub: Subscription;

  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.metersSummarySub = this.facilityOverviewService.waterMeterSummaryData.subscribe(metersSummary => {
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
    if (this.waterDonut && this.metersSummary) {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let hovertemplate: string = '%{label}: %{value:,.0f} ' + selectedFacility.volumeLiquidUnit + ' <extra></extra>'

      this.metersSummary.meterSummaries = _.orderBy(this.metersSummary.meterSummaries, (summary) => { return summary.meter.source });
      var data = [{
        values: this.metersSummary.meterSummaries.map(summary => { return summary.consumption }),
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
      this.plotlyService.newPlot(this.waterDonut.nativeElement, data, layout, config);
    }
  }

}

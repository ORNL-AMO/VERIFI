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
  selector: 'app-energy-meters-overview-chart',
  templateUrl: './energy-meters-overview-chart.component.html',
  styleUrls: ['./energy-meters-overview-chart.component.css']
})
export class EnergyMetersOverviewChartComponent implements OnInit {

  @ViewChild('energyUseDonut', { static: false }) energyUseDonut: ElementRef;
  metersSummary: FacilityMeterSummaryData;
  metersSummarySub: Subscription;

  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

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
    if (this.energyUseDonut && this.metersSummary) {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let hovertemplate: string = '%{label}: %{value:,.0f} ' + selectedFacility.energyUnit + ' <extra></extra>'

      this.metersSummary.meterSummaries = _.orderBy(this.metersSummary.meterSummaries, (summary) => { return summary.meter.source });

      var data = [{
        values: this.metersSummary.meterSummaries.map(summary => { return summary.energyUsage }),
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
      this.plotlyService.newPlot(this.energyUseDonut.nativeElement, data, layout, config);
    }
  }
}

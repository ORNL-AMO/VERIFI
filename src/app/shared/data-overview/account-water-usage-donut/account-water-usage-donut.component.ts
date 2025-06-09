import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';

@Component({
    selector: 'app-account-water-usage-donut',
    templateUrl: './account-water-usage-donut.component.html',
    styleUrls: ['./account-water-usage-donut.component.css'],
    standalone: false
})
export class AccountWaterUsageDonutComponent {
  @Input()
  accountOverviewData: AccountOverviewData;
  @Input()
  waterUnit: string;

  @ViewChild('donutChart', { static: false }) donutChart: ElementRef;
  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && (changes.accountOverviewData && !changes.accountOverviewData.isFirstChange())) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.donutChart && this.accountOverviewData) {
      if (this.accountOverviewData.sourceTotals)
        var data = [{
          values: this.accountOverviewData.waterTypeData.map(waterData => { return waterData.totalConsumption }),
          labels: this.accountOverviewData.waterTypeData.map(waterData => { return waterData.waterType }),
          marker: {
            colors: this.accountOverviewData.waterTypeData.map((total, index) => { return total.color }),
            line: {
              color: '#fff',
              width: 5
            }
          },
          texttemplate: '%{label}: (%{percent:.1%})',
          textposition: 'auto',
          insidetextorientation: "horizontal",
          hovertemplate: '%{label}: %{value:,.0f} ' + this.waterUnit + ' <extra></extra>',
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
        displayModeBar: true,
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.donutChart.nativeElement, data, layout, config);
    }
  }
}

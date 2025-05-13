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
  isVisible: boolean = true;

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
      if (this.accountOverviewData.sourceTotals){
        let values = this.accountOverviewData.waterTypeData.map(waterData => { return waterData.totalConsumption });
        values.reverse();
        let hasNoValue = values.every(value => value == 0);
        let labels = this.accountOverviewData.waterTypeData.map(waterData => { return waterData.waterType });
        labels.reverse();
        let colors = this.accountOverviewData.waterTypeData.map((total, index) => { return total.color });
        colors.reverse();
        let total = values.reduce((sum, val) => sum + val, 0);
        let labelText = labels.map((label, i) => {
          let percentage = ((values[i] / total) * 100).toFixed(1);
          let text = label + " (" + percentage + "%) ";
          return text;
        });

        if(hasNoValue){
          this.isVisible = false;
        }
        else{
          this.isVisible = true;
        var data = [{
          type: 'bar',
          orientation: 'h',
          x: values,
          y: labelText,
          marker: {
            color: colors
          },
          texttemplate: '%{x:,.0f} ' + this.waterUnit,
          textposition: 'auto',
          hovertemplate: '%{x:,.0f} ' + this.waterUnit + ' <extra></extra>',
          automargin: true,

        }];
      }
        var layout = {
          height: 400,
          title: {
            text: '<b>Water Consumption Breakdown</b>',
            font: {
              size: 14,
              family: 'Arial'
            }
          },
          yaxis: {
            automargin: true
          },
          xaxis: {
            automargin: true,
           title: {
            text: '(' + this.waterUnit + ')',
            font: {
              size: 12,
              family: 'Arial'
            }
          }
          },
          font: {
            family: 'Arial'
          }
        };
      
        let config = {
          modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
          displaylogo: false,
          responsive: true
        };
      this.plotlyService.newPlot(this.donutChart.nativeElement, data, layout, config);
    }
  }
}

  // drawChart() {
  //   if (this.donutChart && this.accountOverviewData) {
  //     if (this.accountOverviewData.sourceTotals)
  //       var data = [{
  //         values: this.accountOverviewData.waterTypeData.map(waterData => { return waterData.totalConsumption }),
  //         labels: this.accountOverviewData.waterTypeData.map(waterData => { return waterData.waterType }),
  //         marker: {
  //           colors: this.accountOverviewData.waterTypeData.map((total, index) => { return total.color }),
  //           line: {
  //             color: '#fff',
  //             width: 5
  //           }
  //         },
  //         texttemplate: '%{label}: (%{percent:.1%})',
  //         textposition: 'auto',
  //         insidetextorientation: "horizontal",
  //         hovertemplate: '%{label}: %{value:,.0f} ' + this.waterUnit + ' <extra></extra>',
  //         hole: .5,
  //         type: 'pie',
  //         automargin: true,
  //         sort: false
  //       }];

  //     var layout = {
  //       margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
  //       showlegend: false
  //     };

  //     let config = {
  //       displaylogo: false,
  //       responsive: true
  //     }
  //     this.plotlyService.newPlot(this.donutChart.nativeElement, data, layout, config);
  //   }
  // }
}

import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { PerformanceReport, PerformanceReportAnnualData } from 'src/app/calculations/performance-report-calculations/performanceReport';

@Component({
  selector: 'app-facility-performance-chart',
  templateUrl: './facility-performance-chart.component.html',
  styleUrls: ['./facility-performance-chart.component.css']
})
export class FacilityPerformanceChartComponent {
  @Input()
  performanceReport: PerformanceReport;
  @Input()
  chartDataOption: 'savings' | 'contribution';

  @ViewChild('facilityPerformanceChart', { static: false }) facilityPerformanceChart: ElementRef;


  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.facilityPerformanceChart) {
      var data = new Array();
      this.performanceReport.annualFacilityData.forEach(facilityData => {
        var facilityTrace = {
          type: "scatter",
          mode: "lines+markers",
          name: facilityData.facility.name,
          x: facilityData.annualData.map(data => { return data.year }),
          y: this.getYData(facilityData.annualData),
          line: { color: facilityData.facility.color, width: 2 },
          marker: {
            size: 4
          }
        }
        data.push(facilityTrace);
      })


      // let height: number = 350;
      let title: string = 'Savings By Facility';
      if (this.chartDataOption == 'contribution') {
        title = 'Contribution By Facility';
      }


      var layout = {
        title: {
          text: title,
          font: {
            size: 18
          },
        },
        // height: height,
        legend: {
          orientation: "h"
        },
        xaxis: {
          hoverformat: "%b, %y",
          dtick: 1
        },
        yaxis: {
          ticksuffix: '%',
          // title: {
          //   text: '% Savings',
          //   font: {
          //     size: 16
          //   },
          //   standoff: 18
          // },
          automargin: true,
        },
        margin: { r: 0, t: 50 }
      };
      var config = {
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.facilityPerformanceChart.nativeElement, data, layout, config);
    }
  }

  getPercentValue(value: number): string {
    return (value).toLocaleString(undefined, { maximumFractionDigits: 2, minimumIntegerDigits: 1 })
  }

  getYData(annualData: Array<PerformanceReportAnnualData>): Array<number> {
    return annualData.map(data => {
      if (this.chartDataOption == 'contribution') {
        return data.contribution;
      } else {
        return data.savings;
      }
    });
  }
}

import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { PerformanceReport, PerformanceReportAnnualData } from 'src/app/calculations/performance-report-calculations/performanceReport';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccountReport } from 'src/app/models/idb';
@Component({
  selector: 'app-group-performance-chart',
  templateUrl: './group-performance-chart.component.html',
  styleUrls: ['./group-performance-chart.component.css']
})
export class GroupPerformanceChartComponent {
  @Input()
  performanceReport: PerformanceReport;
  @Input()
  chartDataOption: 'savings' | 'contribution';
  @Input()
  report: IdbAccountReport;

  @ViewChild('groupPerformanceChart', { static: false }) groupPerformanceChart: ElementRef;


  constructor(private plotlyService: PlotlyService, private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.groupPerformanceChart) {
      var data = new Array();
      this.performanceReport.annualGroupData.forEach(groupData => {

        let name: string = groupData.facility.name + ' (' + this.utilityMeterGroupDbService.getGroupName(groupData.group.idbGroupId) + ')';

        var facilityTrace = {
          type: "scatter",
          mode: "lines+markers",
          name: name,
          texttemplate: '%{label}: (%{percent:.1%})',
          x: groupData.annualData.map(data => { return data.year }),
          y: this.getYData(groupData.annualData),
          line: { color: groupData.facility.color, width: 2 },
          marker: {
            size: 4
          }
        }
        data.push(facilityTrace);
      })


      // let height: number = 350;
      let title: string = 'Savings By Facility Group';
      if (this.chartDataOption == 'contribution') {
        title = 'Contribution By Facility Group';
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
          tickformat: '%{value:.1%}',
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
      this.plotlyService.newPlot(this.groupPerformanceChart.nativeElement, data, layout, config);
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

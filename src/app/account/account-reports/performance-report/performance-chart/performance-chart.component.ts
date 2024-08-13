import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { PerformanceReport, PerformanceReportAnnualData } from 'src/app/calculations/performance-report-calculations/performanceReport';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { PerformanceReportSetup } from 'src/app/models/overview-report';
import { UtilityColors } from 'src/app/shared/utilityColors';
import * as _ from 'lodash';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-performance-chart',
  templateUrl: './performance-chart.component.html',
  styleUrls: ['./performance-chart.component.css']
})
export class PerformanceChartComponent {
  @Input()
  performanceReport: PerformanceReport;
  @Input()
  chartDataOption: 'savings' | 'contribution';
  @Input()
  chartDataType: 'facility' | 'group' | 'utility';
  @Input()
  performanceReportSetup: PerformanceReportSetup;

  @ViewChild('performanceChart', { static: false }) performanceChart: ElementRef;


  constructor(private plotlyService: PlotlyService, private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.performanceChart) {
      var data = [];
      let title: string = 'Savings By ';
      if (this.chartDataOption == 'contribution') {
        title = 'Contribution By ';
      }
      if (this.chartDataType == 'facility') {
        data = this.getFacilityTraces();
        title = title + 'Facility';
      } else if (this.chartDataType == 'group') {
        data = this.getGroupTraces();
        title = title + 'Group';
      } else if (this.chartDataType == 'utility') {
        data = this.getUtilityTraces();
        title = title + 'Utility';
      }

      if (this.chartDataOption == 'savings') {
        data.push({
          type: "scatter",
          mode: "lines+markers",
          name: 'Corporate',
          x: this.performanceReport.facilityTotals.map(data => { return data.year }),
          y: this.performanceReport.facilityTotals.map(data => { return data.savings }),
          line: { dash: 'dot', color: '#17202A', width: 6 },
          marker: {
            size: 8
          }
        })
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
      this.plotlyService.newPlot(this.performanceChart.nativeElement, data, layout, config);
    }
  }

  getPercentValue(value: number): string {
    return (value).toLocaleString(undefined, { maximumFractionDigits: 2, minimumIntegerDigits: 1 })
  }

  getYData(annualData: Array<{ contribution: number, savings: number }>): Array<number> {
    return annualData.map(data => {
      if (this.chartDataOption == 'contribution') {
        return data.contribution;
      } else {
        return data.savings;
      }
    });
  }

  getFacilityTraces() {
    let topBottomIds: Array<string> = new Array();
    let annualFacilityData: Array<{
      facility: IdbFacility,
      annualData: Array<PerformanceReportAnnualData>
    }> = this.performanceReport.annualFacilityData.map(data => { return data });
    annualFacilityData = _.orderBy(annualFacilityData, (data: { facility: IdbFacility, annualData: Array<PerformanceReportAnnualData> }) => {
      let yearSummary: PerformanceReportAnnualData = data.annualData.find(summary => { return summary.year == this.performanceReport.reportYear })
      return yearSummary[this.chartDataOption];
    }, 'desc');
    for (let i = 0; i < this.performanceReportSetup.numberOfTopPerformers; i++) {
      let topItem = annualFacilityData[i];
      if (topItem) {
        topBottomIds.push(topItem.facility.guid);
      }
      let bottomItem = annualFacilityData[annualFacilityData.length - (i + 1)];
      if (bottomItem) {
        topBottomIds.push(bottomItem.facility.guid);
      }
    }

    var data = new Array();
    this.performanceReport.annualFacilityData.forEach(facilityData => {
      let visible;
      if (topBottomIds.includes(facilityData.facility.guid) == false) {
        visible = 'legendonly';
      }
      var facilityTrace = {
        type: "scatter",
        mode: "lines+markers",
        name: facilityData.facility.name,
        x: facilityData.annualData.map(data => { return data.year }),
        y: this.getYData(facilityData.annualData),
        line: { color: facilityData.facility.color, width: 2 },
        marker: {
          size: 4
        },
        visible: visible
      }
      data.push(facilityTrace);
    });
    return data;
  }

  getGroupTraces() {
    let topBottomIds: Array<string> = new Array();
    let annualGroupData: Array<{
      facility: IdbFacility,
      group: AnalysisGroup,
      annualData: Array<PerformanceReportAnnualData>
    }> = this.performanceReport.annualGroupData.map(data => { return data });
    annualGroupData = _.orderBy(annualGroupData, (data: { facility: IdbFacility, annualData: Array<PerformanceReportAnnualData> }) => {
      let yearSummary: PerformanceReportAnnualData = data.annualData.find(summary => { return summary.year == this.performanceReport.reportYear })
      return yearSummary[this.chartDataOption];
    }, 'desc');
    for (let i = 0; i < this.performanceReportSetup.numberOfTopPerformers; i++) {
      let topItem = annualGroupData[i];
      if (topItem) {
        topBottomIds.push(topItem.group.idbGroupId);
      }
      let bottomItem = annualGroupData[annualGroupData.length - (i + 1)];
      if (bottomItem) {
        topBottomIds.push(bottomItem.group.idbGroupId);
      }
    }


    var data = new Array();
    this.performanceReport.annualGroupData.forEach(groupData => {
      let visible;
      if (topBottomIds.includes(groupData.group.idbGroupId) == false) {
        visible = 'legendonly';
      }

      let name: string = groupData.facility.name + ' (' + this.utilityMeterGroupDbService.getGroupName(groupData.group.idbGroupId) + ')';
      var facilityTrace = {
        visible: visible,
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
    });
    return data;
  }

  getUtilityTraces() {
    var data = new Array();
    this.performanceReport.annualUtilityData.forEach(utilityData => {
      var facilityTrace = {
        type: "scatter",
        mode: "lines+markers",
        name: utilityData.utilityClassification,
        texttemplate: '%{label}: (%{percent:.1%})',
        x: utilityData.annualData.map(data => { return data.year }),
        y: this.getYData(utilityData.annualData),
        line: { color: UtilityColors[utilityData.utilityClassification]?.color, width: 2 },
        marker: {
          size: 4
        }
      }
      data.push(facilityTrace);
    });
    return data;
  }
}

import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { BetterClimateAnnualFacilitySummary, BetterClimateReport } from 'src/app/calculations/carbon-calculations/betterClimateReport';
import * as _ from 'lodash';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-top-performers-chart',
  templateUrl: './top-performers-chart.component.html',
  styleUrls: ['./top-performers-chart.component.css']
})
export class TopPerformersChartComponent {
  @Input()
  betterClimateReport: BetterClimateReport;
  @Input()
  chartDataOption: 'scope1PercentReductions' | 'scope1ReductionContribution' | 'scope2MarketPercentReductions' | 'scope2MarketReductionContribution' | 'scope2LocationPercentReductions' | 'scope2LocationReductionContribution';
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup

  @ViewChild('performanceChart', { static: false }) performanceChart: ElementRef;


  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.performanceChart) {
      var data = this.getFacilityTraces();
      let title: string = 'Savings By Facility';
      if (this.chartDataOption == 'scope1ReductionContribution' || this.chartDataOption == 'scope2MarketReductionContribution' || this.chartDataOption == 'scope2LocationReductionContribution') {
        title = 'Contribution By Facility';
      }


      if (this.chartDataOption == 'scope1PercentReductions' || this.chartDataOption == 'scope2MarketPercentReductions' || this.chartDataOption == 'scope2LocationPercentReductions') {
        data.push({
          type: "scatter",
          mode: "lines+markers",
          name: 'Corporate',
          x: this.betterClimateReport.portfolioYearDetails.map(data => { return data.year }),
          y: this.betterClimateReport.portfolioYearDetails.map(data => { return data[this.chartDataOption] }),
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
          // hoverformat: "%b, %y",
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


  getFacilityTraces() {
    let topBottomIds: Array<string> = new Array();
    let annualFacilityData: Array<BetterClimateAnnualFacilitySummary> = this.betterClimateReport.annualFacilitiesSummaries.map(data => { return data });
    annualFacilityData = _.orderBy(annualFacilityData, (data: BetterClimateAnnualFacilitySummary) => {
      let yearSummary: BetterClimateYearDetails = data.betterClimateYearDetails.find(summary => { return summary.year == this.betterClimateReport.reportYear })
      return yearSummary[this.chartDataOption];
    }, 'desc');
    for (let i = 0; i < this.betterClimateReportSetup.numberOfTopPerformers; i++) {
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
    this.betterClimateReport.annualFacilitiesSummaries.forEach(facilityData => {
      let visible;
      if (topBottomIds.includes(facilityData.facility.guid) == false) {
        visible = 'legendonly';
      }
      var facilityTrace = {
        type: "scatter",
        mode: "lines+markers",
        name: facilityData.facility.name,
        x: facilityData.betterClimateYearDetails.map(data => { return data.year }),
        y: facilityData.betterClimateYearDetails.map(data => { return this.getPercentValue(data[this.chartDataOption]) }),
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
}
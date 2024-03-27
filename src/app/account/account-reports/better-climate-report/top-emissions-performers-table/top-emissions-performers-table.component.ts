import { Component, Input } from '@angular/core';
import { BetterClimateAnnualFacilitySummary, BetterClimateReport } from 'src/app/calculations/carbon-calculations/betterClimateReport';
import * as _ from 'lodash';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-top-emissions-performers-table',
  templateUrl: './top-emissions-performers-table.component.html',
  styleUrls: ['./top-emissions-performers-table.component.css']
})
export class TopEmissionsPerformersTableComponent {
  @Input()
  betterClimateReport: BetterClimateReport;
  @Input()
  chartDataOption: 'scope1PercentReductions' | 'scope1ReductionContributionRelative' | 'scope2MarketPercentReductions' | 'scope2MarketReductionContributionRelative' | 'scope2LocationPercentReductions' | 'scope2LocationReductionContributionRelative';
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;

  tableData: Array<{
    order: number,
    highValueName: string,
    topValue: number,
    lowValueName: string,
    lowValue: number
  }>;
  valueLabel: 'Savings' | 'Contribution' | 'Production';
  orderDataField: string = 'order';
  orderByDirection: 'asc' | 'desc' = 'asc';
  constructor() {

  }

  ngOnInit() {
    if (this.chartDataOption == 'scope1ReductionContributionRelative' || this.chartDataOption == 'scope2MarketReductionContributionRelative' || this.chartDataOption == 'scope2LocationReductionContributionRelative') {
      this.valueLabel = 'Contribution';
    } else if (this.chartDataOption == 'scope1PercentReductions' || this.chartDataOption == 'scope2MarketPercentReductions' || this.chartDataOption == 'scope2LocationPercentReductions') {
      this.valueLabel = 'Savings';
    }
    this.setFacilityData();
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  setFacilityData() {
    let annualFacilityData: Array<BetterClimateAnnualFacilitySummary> = this.betterClimateReport.annualFacilitiesSummaries.map(data => { return data });


    annualFacilityData = _.orderBy(annualFacilityData, (data: BetterClimateAnnualFacilitySummary) => {
      let yearSummary: BetterClimateYearDetails = data.betterClimateYearDetails.find(summary => { return summary.year == this.betterClimateReport.reportYear })
      return this.getValue(yearSummary);
    }, 'desc');
    this.tableData = new Array();

    //todo: Number of top performers
    for (let i = 0; i < this.betterClimateReportSetup.numberOfTopPerformers; i++) {
      let topFacilityItem: BetterClimateAnnualFacilitySummary = annualFacilityData[i];

      let topFacilityName: string;
      let topValue: number;
      if (topFacilityItem) {
        let yearSummary: BetterClimateYearDetails = topFacilityItem.betterClimateYearDetails.find(data => { return data.year == this.betterClimateReport.reportYear });
        topFacilityName = topFacilityItem.facility.name;
        topValue = this.getValue(yearSummary);
      }
      let lowFacilityItem: BetterClimateAnnualFacilitySummary = annualFacilityData[annualFacilityData.length - (i + 1)];
      let lowFacilityName: string;
      let lowValue: number;
      if (lowFacilityItem) {
        let yearSummary: BetterClimateYearDetails = lowFacilityItem.betterClimateYearDetails.find(data => { return data.year == this.betterClimateReport.reportYear });
        lowFacilityName = lowFacilityItem.facility.name;
        lowValue = this.getValue(yearSummary);
      }
      this.tableData.push({
        order: i + 1,
        highValueName: topFacilityName,
        topValue: topValue,
        lowValueName: lowFacilityName,
        lowValue: lowValue
      });
    }
  }


  getValue(yearSummary: BetterClimateYearDetails): number {
    if (this.chartDataOption == 'scope1PercentReductions') {
      return yearSummary.percentReductions.totalScope1Emissions;
    } else if (this.chartDataOption == 'scope1ReductionContributionRelative') {
      return yearSummary.relativeContribution.totalScope1Emissions;
    } else if (this.chartDataOption == 'scope2MarketPercentReductions') {
      return yearSummary.percentReductions.scope2MarketEmissions;
    } else if (this.chartDataOption == 'scope2MarketReductionContributionRelative') {
      return yearSummary.relativeContribution.scope2MarketEmissions;
    } else if (this.chartDataOption == 'scope2LocationPercentReductions') {
      return yearSummary.percentReductions.scope2LocationEmissions;
    } else if (this.chartDataOption == 'scope2LocationReductionContributionRelative') {
      return yearSummary.relativeContribution.scope2LocationEmissions;
    }
  }


}

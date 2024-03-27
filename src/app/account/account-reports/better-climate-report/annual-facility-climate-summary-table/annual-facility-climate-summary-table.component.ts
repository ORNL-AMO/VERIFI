import { Component, Input } from '@angular/core';
import { BetterClimateAnnualFacilitySummary, BetterClimateFacilityMaxMin, BetterClimateReport } from 'src/app/calculations/carbon-calculations/betterClimateReport';
import * as _ from 'lodash';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';
@Component({
  selector: 'app-annual-facility-climate-summary-table',
  templateUrl: './annual-facility-climate-summary-table.component.html',
  styleUrls: ['./annual-facility-climate-summary-table.component.css']
})
export class AnnualFacilityClimateSummaryTableComponent {
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;
  @Input()
  emissionsType: 'scope1' | 'scope2Market' | 'scope2Location';
  @Input()
  betterClimateReport: BetterClimateReport;

  orderDataField: string = 'scope1Emissions';
  orderByDirection: 'asc' | 'desc' = 'desc';
  numberOfData: number;
  orderByYear: number;

  annualFacilitiesSummaries: Array<BetterClimateAnnualFacilitySummary>;
  accountDetails: Array<BetterClimateYearDetails>;
  facilityMaxMin: Array<BetterClimateFacilityMaxMin>;
  constructor() {
  }

  ngOnInit() {
    this.annualFacilitiesSummaries = this.betterClimateReport.annualFacilitiesSummaries;
    this.accountDetails = this.betterClimateReport.portfolioYearDetails;
    this.facilityMaxMin = this.betterClimateReport.facilityMaxMins;
    if (this.emissionsType == 'scope1') {
      this.orderDataField = 'scope1Emissions';
    } else if (this.emissionsType == 'scope2Location') {
      this.orderDataField = 'scope2LocationEmissions';
    } else if (this.emissionsType == 'scope2Market') {
      this.orderDataField = 'scope2MarketEmissions';
    }
    this.orderByYear = this.accountDetails[this.accountDetails.length - 1].year;
    this.orderData();
  }

  setOrderDataField(str: string, year: number) {
    if (str == this.orderDataField && year == this.orderByYear) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
      this.orderByYear = year;
    }
    this.orderData();
  }

  orderData() {
    if (this.orderDataField == 'facilityName') {
      this.annualFacilitiesSummaries = _.orderBy(this.annualFacilitiesSummaries, (data: BetterClimateAnnualFacilitySummary) => {
        return data.facility.name;
      }, this.orderByDirection);
    } else if (this.orderDataField == 'size') {
      this.annualFacilitiesSummaries = _.orderBy(this.annualFacilitiesSummaries, (data: BetterClimateAnnualFacilitySummary) => {
        return data.facility.size;
      }, this.orderByDirection);
    } else {
      this.annualFacilitiesSummaries = _.orderBy(this.annualFacilitiesSummaries, (data: BetterClimateAnnualFacilitySummary) => {
        let betterClimateFacility: BetterClimateYearDetails = data.betterClimateYearDetails.find(summary => { return summary.year == this.orderByYear })
        return this.getValue(betterClimateFacility);
      }, this.orderByDirection);
    }
  }

  getValue(betterClimateFacility: BetterClimateYearDetails){
    if(this.orderDataField == 'scope1Emissions'){
      return betterClimateFacility.emissionsResults.totalScope1Emissions;
    }else if(this.orderDataField == 'scope2LocationEmissions'){
      return betterClimateFacility.emissionsResults.scope2LocationEmissions;
    }else if(this.orderDataField == 'scope2MarketEmissions'){
      return betterClimateFacility.emissionsResults.scope2MarketEmissions;
    }
  }
}

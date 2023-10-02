import { Component, Input } from '@angular/core';
import { BetterClimateAnnualFacilitySummary, BetterClimateReport } from 'src/app/calculations/carbon-calculations/betterClimateReport';
import * as _ from 'lodash';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
@Component({
  selector: 'app-annual-facility-climate-summary-table',
  templateUrl: './annual-facility-climate-summary-table.component.html',
  styleUrls: ['./annual-facility-climate-summary-table.component.css']
})
export class AnnualFacilityClimateSummaryTableComponent {
  @Input()
  annualFacilitiesSummaries: Array<BetterClimateAnnualFacilitySummary>;
  @Input()
  accountDetails: Array<BetterClimateYearDetails>;
  @Input()
  facilityTotals: Array<{
    year: number;
    scope1Emissions: number;
    scope2LocationEmissions: number;
    scope2MarketEmissions: number;
  }>;
  @Input()
  emissionsType: 'scope1' | 'scope2Market' | 'scope2Location';
  @Input()
  betterClimateReport: BetterClimateReport;

  orderDataField: string = 'totalScope1Emissions';
  orderByDirection: 'asc' | 'desc' = 'desc';
  numberOfData: number;
  orderByYear: number;
  constructor() {
  }

  ngOnInit() {
    if (this.emissionsType == 'scope1') {
      this.orderDataField = 'totalScope1Emissions';
    } else if (this.emissionsType == 'scope2Location') {
      this.orderDataField = 'scope2LocationEmissions';
    } else if (this.emissionsType == 'scope2Market') {
      this.orderDataField = 'scope2MarketEmissions';
    }
    this.orderByYear = this.facilityTotals[this.facilityTotals.length - 1].year;
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
        return betterClimateFacility[this.orderDataField];
      }, this.orderByDirection);
    }
  }
}

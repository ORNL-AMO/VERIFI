import { Component, Input } from '@angular/core';
import { BetterClimateFacility } from 'src/app/calculations/carbon-calculations/betterClimateFacility';
import { BetterClimateAnnualFacilitySummary } from 'src/app/calculations/carbon-calculations/betterClimateReport';

@Component({
  selector: 'app-annual-facility-climate-summary-table',
  templateUrl: './annual-facility-climate-summary-table.component.html',
  styleUrls: ['./annual-facility-climate-summary-table.component.css']
})
export class AnnualFacilityClimateSummaryTableComponent {
  @Input()
  annualFacilitySummary: BetterClimateAnnualFacilitySummary;


  orderDataField: string = 'scope1Emissions';
  orderByDirection: 'asc' | 'desc' = 'desc';
  constructor(){

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
}

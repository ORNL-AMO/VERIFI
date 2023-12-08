import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccount } from 'src/app/models/idb';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-absolute-emissions-table',
  templateUrl: './absolute-emissions-table.component.html',
  styleUrls: ['./absolute-emissions-table.component.css']
})
export class AbsoluteEmissionsTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  account: IdbAccount;
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;

  hasStationary: boolean;
  hasMobile: boolean;
  hasFugitive: boolean;
  hasProcess: boolean;
  constructor(){

  }


  ngOnInit(){
    this.hasStationary = this.yearDetails.find(detail => {
      return detail.emissionsResults.stationaryEmissions != 0;
    }) != undefined;
    this.hasMobile = this.yearDetails.find(detail => {
      return detail.emissionsResults.mobileTotalEmissions != 0;
    }) != undefined;
    this.hasFugitive = this.yearDetails.find(detail => {
      return detail.emissionsResults.fugitiveEmissions != 0;
    }) != undefined;
    this.hasProcess = this.yearDetails.find(detail => {
      return detail.emissionsResults.processEmissions != 0;
    }) != undefined;
  }

}

import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
    selector: 'app-absolute-emissions-table',
    templateUrl: './absolute-emissions-table.component.html',
    styleUrls: ['./absolute-emissions-table.component.css'],
    standalone: false
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
  hasBiomass: boolean;
  hasOtherScope2: boolean;
  selectedReport: IdbAccountReport;
  constructor(private accountReportDbService: AccountReportDbService) {}

  ngOnInit() {
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
    this.hasBiomass = this.yearDetails.find(detail => {
      return detail.emissionsResults.totalBiogenicEmissions != 0;
    }) != undefined;
    this.hasOtherScope2 = this.yearDetails.find(detail => {
      return detail.emissionsResults.otherScope2Emissions != 0;
    }) != undefined;

    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
  }

}

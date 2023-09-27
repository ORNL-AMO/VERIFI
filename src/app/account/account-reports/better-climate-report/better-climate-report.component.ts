import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount, IdbAccountReport, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { AccountReportsService } from '../account-reports.service';
import { Router } from '@angular/router';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { BetterClimateReport } from 'src/app/calculations/carbon-calculations/betterClimateReport';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';

@Component({
  selector: 'app-better-climate-report',
  templateUrl: './better-climate-report.component.html',
  styleUrls: ['./better-climate-report.component.css']
})
export class BetterClimateReportComponent {

  selectedReport: IdbAccountReport;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  calculating: boolean | 'error';
  worker: Worker;
  betterClimateReport: BetterClimateReport;
  cellWidth: number;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private router: Router, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private eGridService: EGridService) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.calculateCarbonReport();
    this.setCellWidth();

  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }


  calculateCarbonReport() {
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/better-climate-report.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.calculating = false;
          this.betterClimateReport = data.betterClimateReport;
        } else {
          this.calculating = 'error';
        }
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        baselineYear: this.selectedReport.baselineYear,
        reportYear: this.selectedReport.reportYear,
        account: this.account,
        facilities: accountFacilities,
        meters: accountMeters,
        meterData: accountMeterData,
        co2Emissions: this.eGridService.co2Emissions,
        emissionsDisplay: this.selectedReport.betterClimateReportSetup.emissionsDisplay,
        emissionsGoal: this.account.sustainabilityQuestions.greenhouseReductionPercent
      });
    } else {
      // Web Workers are not supported in this environment
      this.calculating = false;
    }
  }

  setCellWidth() {
    let numCells: number = 1;
    for (let i = this.selectedReport.baselineYear; i <= this.selectedReport.reportYear; i++) {
      numCells++;
    }
    this.cellWidth = (100 / numCells);
  }
}

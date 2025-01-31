import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../account-reports.service';
import { Router } from '@angular/router';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { BetterClimateReport } from 'src/app/calculations/carbon-calculations/betterClimateReport';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import * as _ from 'lodash';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { BetterClimateExcelWriterService } from '../excel-writer-services/better-climate-excel-writer.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
    selector: 'app-better-climate-report',
    templateUrl: './better-climate-report.component.html',
    styleUrls: ['./better-climate-report.component.css'],
    standalone: false
})
export class BetterClimateReportComponent {

  selectedReport: IdbAccountReport;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  calculating: boolean | 'error';
  worker: Worker;
  betterClimateReport: BetterClimateReport;
  betterClimateReportUnfiltered: BetterClimateReport;
  betterClimateReportSetup: BetterClimateReportSetup;
  cellWidth: number;
  generateExcelSub: Subscription;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private router: Router, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private eGridService: EGridService,
    private customFuelDbService: CustomFuelDbService,
    private betterClimateExcelWriterService: BetterClimateExcelWriterService,
    private loadingService: LoadingService) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    } else {
      this.betterClimateReportSetup = this.selectedReport.betterClimateReportSetup;
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.calculateCarbonReport();
    this.setCellWidth();

    this.generateExcelSub = this.accountReportsService.generateExcel.subscribe(generateExcel => {
      if (generateExcel == true) {
        this.generateExcelReport();
      }
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.generateExcelSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }


  calculateCarbonReport() {
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue()
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/better-climate-report.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.betterClimateReportUnfiltered = _.cloneDeep(data.betterClimateReport);
          this.betterClimateReport = this.filterIntermediateYears(data.betterClimateReport);
          this.calculating = false;
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
        emissionsGoal: this.account.sustainabilityQuestions.greenhouseReductionPercent,
        customFuels: customFuels,
        betterClimateReportSetup: this.selectedReport.betterClimateReportSetup
      });
    } else {
      // Web Workers are not supported in this environment
      let betterClimateReport: BetterClimateReport = new BetterClimateReport(this.account, accountFacilities, accountMeters, accountMeterData, this.selectedReport.baselineYear, this.selectedReport.reportYear,
        this.eGridService.co2Emissions, this.selectedReport.betterClimateReportSetup.emissionsDisplay, this.account.sustainabilityQuestions.greenhouseReductionPercent, customFuels, this.selectedReport.betterClimateReportSetup);
      this.betterClimateReportUnfiltered = _.cloneDeep(betterClimateReport);
      this.betterClimateReport = this.filterIntermediateYears(betterClimateReport);
      this.calculating = false;


    }
  }

  setCellWidth() {
    let numberOfYears: number = this.selectedReport.reportYear - this.selectedReport.baselineYear;
    if (numberOfYears > 3 && this.selectedReport.betterClimateReportSetup.skipIntermediateYears) {
      this.cellWidth = 25;
    } else {
      this.cellWidth = (100 / (numberOfYears + 2));
    }
  }

  filterIntermediateYears(betterClimateReport: BetterClimateReport): BetterClimateReport {
    let numberOfYears: number = this.selectedReport.reportYear - this.selectedReport.baselineYear;
    if (numberOfYears > 3 && this.selectedReport.betterClimateReportSetup.skipIntermediateYears) {
      let includedYears: Array<number> = [this.selectedReport.reportYear - 1, this.selectedReport.reportYear, this.selectedReport.baselineYear]
      betterClimateReport.portfolioYearDetails = betterClimateReport.portfolioYearDetails.filter(summary => {
        return includedYears.includes(summary.year)
      });
      betterClimateReport.facilityMaxMins = betterClimateReport.facilityMaxMins.filter(summary => {
        return includedYears.includes(summary.year)
      });
      betterClimateReport.annualFacilitiesSummaries.forEach(summary => {
        summary.betterClimateYearDetails = summary.betterClimateYearDetails.filter(summary => {
          return includedYears.includes(summary.year)
        });
      });
    }
    return betterClimateReport;
  }

  generateExcelReport() {
    this.loadingService.setLoadingMessage('Generating Better Climate Excel Report...');
    this.loadingService.setLoadingStatus(true);
    //export to excell method sets loading status to false upon completion or error.
    this.betterClimateExcelWriterService.exportToExcel(this.selectedReport, this.account, this.betterClimateReportUnfiltered);
    this.accountReportsService.generateExcel.next(false);
  }
}

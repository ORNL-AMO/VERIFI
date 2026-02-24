import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { AccountReportsService } from '../account-reports.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
  selector: 'app-account-reports-banner',
  templateUrl: './account-reports-banner.component.html',
  styleUrls: ['./account-reports-banner.component.css'],
  standalone: false
})
export class AccountReportsBannerComponent {

  routerSub: Subscription;
  inDashboard: boolean;
  modalOpenSub: Subscription;
  modalOpen: boolean;
  setupValid: boolean;
  selectedReportSub: Subscription;
  selectedReport: IdbAccountReport;
  errorMessage: string = '';
  errorSub: Subscription;
  showDropdown: boolean = false;
  reportList: Array<IdbAccountReport>;
  reportListSub: Subscription;
  compareBaselineYearToReportYearError: boolean;
  compareBaselineYearToReportYearErrorSub: Subscription;
  analysisVisitedSub: Subscription;
  analysisVisited: boolean = false;

  constructor(private router: Router,
    private sharedDataService: SharedDataService,
    private accountReportsService: AccountReportsService,
    private accountReportDbService: AccountReportDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,) { }
  ngOnInit() {
    this.routerSub = this.router.events.subscribe(event => {
      this.setInDashboard();
      this.showDropdown = false;
    });
    this.setInDashboard();
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.errorSub = this.accountReportsService.errorMessage.subscribe(errorMessage => {
      this.errorMessage = errorMessage;
      if (this.selectedReport) {
        this.setValidation(this.selectedReport);
      }
    });

    this.compareBaselineYearToReportYearErrorSub = this.accountReportsService.compareBaselineYearToReportYearError.subscribe(showError => {
      this.compareBaselineYearToReportYearError = showError;
      if (this.selectedReport) {
        this.setValidation(this.selectedReport);
      }
    });

    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
      if (val) {
        this.setValidation(val);
        this.checkIfAnalysisVisited();
      }
    });

    this.reportListSub = this.accountReportDbService.accountReports.subscribe(reports => {
      this.reportList = reports;
    });

    this.analysisVisitedSub = this.accountAnalysisDbService.analysisVisited.subscribe(() => {
      if (this.selectedReport) {
        this.checkIfAnalysisVisited();
      }
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.selectedReportSub.unsubscribe();
    this.analysisVisitedSub.unsubscribe();
    this.errorSub.unsubscribe();
    this.reportListSub.unsubscribe();
  }

  checkIfAnalysisVisited() {
    let analysisItem: IdbAccountAnalysisItem;
    if (this.selectedReport) {
      if (this.selectedReport.reportType == 'betterPlants') {
        analysisItem = this.accountAnalysisDbService.getByGuid(this.selectedReport.betterPlantsReportSetup?.analysisItemId);
      }
      else if (this.selectedReport.reportType == 'performance') {
        analysisItem = this.accountAnalysisDbService.getByGuid(this.selectedReport.performanceReportSetup?.analysisItemId);
      }
      else if (this.selectedReport.reportType == 'accountSavings') {
        analysisItem = this.accountAnalysisDbService.getByGuid(this.selectedReport.accountSavingsReportSetup?.analysisItemId);
      }
    }
  
    if (analysisItem) {
      this.analysisVisited = analysisItem.isAnalysisVisited;
    }
    else {
      this.analysisVisited = false;
    }
  }

  setInDashboard() {
    this.inDashboard = this.router.url.includes('dashboard');

  }

  setValidation(report: IdbAccountReport) {
    let setupValid: boolean = this.accountReportsService.getSetupFormFromReport(report).valid;
    let betterPlantsValid: boolean = true;
    let dataOverviewValid: boolean = true;
    let performanceValid: boolean = true;
    let betterClimateValid: boolean = true;
    let analysisValid: boolean = true;
    let accountSavingsValid: boolean = true;
    let emissionFactorsValid: boolean = true;
    if (report.reportType == 'dataOverview') {
      if (this.errorMessage.length > 0) {
        dataOverviewValid = false;
      }
      else {
        dataOverviewValid = this.accountReportsService.getDataOverviewFormFromReport(report.dataOverviewReportSetup).valid;
      }
      this.setupValid = (setupValid && dataOverviewValid);
    }
    else if (report.reportType == 'performance') {
      if (this.compareBaselineYearToReportYearError) {
        performanceValid = false;
      }
      else {
        performanceValid = this.accountReportsService.getPerformanceFormFromReport(report.performanceReportSetup).valid;
      }
      this.setupValid = (setupValid && performanceValid);
    }
    else if (report.reportType == 'betterClimate') {
      if (this.compareBaselineYearToReportYearError) {
        betterClimateValid = false;
      }
      else {
        betterClimateValid = this.accountReportsService.getBetterCimateFormFromReport(report.betterClimateReportSetup).valid;
      }
      this.setupValid = (setupValid && betterClimateValid);
    }
    else if (report.reportType == 'accountEmissionFactors') {
      if (this.errorMessage.length > 0) {
        emissionFactorsValid = false;
      }
      else {
        emissionFactorsValid = true;
      }
      this.setupValid = (setupValid && emissionFactorsValid);
    }
    else {
      if (report.reportType == 'betterPlants') {
        betterPlantsValid = this.accountReportsService.getBetterPlantsFormFromReport(report.betterPlantsReportSetup).valid;
      } else if (report.reportType == 'analysis') {
        analysisValid = this.accountReportsService.getAnalysisFormFromReport(report.analysisReportSetup).valid;
      } else if (report.reportType == 'accountSavings') {
        accountSavingsValid = this.accountReportsService.getAccountSavingsFormFromReport(report.accountSavingsReportSetup).valid;
      }
      this.setupValid = (setupValid && betterPlantsValid && analysisValid && accountSavingsValid);
    }
  }

  goToDashboard() {
    this.router.navigateByUrl('/data-evaluation/account/reports/dashboard');
  }

  toggleShow() {
    this.showDropdown = !this.showDropdown;
  }

  selectItem(item: IdbAccountReport) {
    this.accountReportDbService.selectedReport.next(item);
    this.router.navigateByUrl('/data-evaluation/account/reports/setup');
    this.showDropdown = false;
  }

}

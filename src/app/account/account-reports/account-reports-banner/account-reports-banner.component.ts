import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { AccountReportsService } from '../account-reports.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

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

  constructor(private router: Router,
    private sharedDataService: SharedDataService,
    private accountReportsService: AccountReportsService,
    private accountReportDbService: AccountReportDbService) { }
  ngOnInit() {
    this.routerSub = this.router.events.subscribe(event => {
      this.setInDashboard();
    });
    this.setInDashboard();
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.errorSub = this.accountReportsService.errorMessage$.subscribe(errorMessage => {
      this.errorMessage = errorMessage;
      this.setValidation(this.selectedReport);  //setValidation() is called here to take care of the validation on browser reload.
    });

    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
      if (val) {
        this.setValidation(val);
      }
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.selectedReportSub.unsubscribe();
    this.errorSub.unsubscribe();
  }


  setInDashboard() {
    this.inDashboard = this.router.url.includes('dashboard');
  }

  setValidation(report: IdbAccountReport) {
    let setupValid: boolean = this.accountReportsService.getSetupFormFromReport(report).valid;
    let betterPlantsValid: boolean = true;
    let dataOverviewValid: boolean = true;
    let performanceValid: boolean = true;
    if (report.reportType == 'dataOverview') {
      if (this.errorMessage.length > 0) {
        dataOverviewValid = false;
      }
      else {
        dataOverviewValid = this.accountReportsService.getDataOverviewFormFromReport(report.dataOverviewReportSetup).valid;
      }
      this.setupValid = (setupValid && dataOverviewValid);
    }
    else {
      if (report.reportType == 'betterPlants') {
        betterPlantsValid = this.accountReportsService.getBetterPlantsFormFromReport(report.betterPlantsReportSetup).valid;
      } else if (report.reportType == 'performance') {
        performanceValid = this.accountReportsService.getPerformanceFormFromReport(report.performanceReportSetup).valid;
      }
      this.setupValid = (setupValid && betterPlantsValid && performanceValid);
    }
  }

  goToDashboard() {
    if (this.selectedReport.reportType == 'betterPlants') {
      this.router.navigateByUrl('/account/reports/dashboard/better-plants')
    } else if (this.selectedReport.reportType == 'dataOverview') {
      this.router.navigateByUrl('/account/reports/dashboard/overview')
    } else if (this.selectedReport.reportType == 'performance') {
      this.router.navigateByUrl('/account/reports/dashboard/performance')
    } else {
      this.router.navigateByUrl('/account/reports/dashboard')
    }
  }


}

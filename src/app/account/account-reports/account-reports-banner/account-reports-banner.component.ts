import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { AccountReportsService } from '../account-reports.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idb';

@Component({
  selector: 'app-account-reports-banner',
  templateUrl: './account-reports-banner.component.html',
  styleUrls: ['./account-reports-banner.component.css']
})
export class AccountReportsBannerComponent {

  routerSub: Subscription;
  inDashboard: boolean;
  modalOpenSub: Subscription;
  modalOpen: boolean;
  setupValid: boolean;
  selectedReportSub: Subscription;
  selectedReport: IdbAccountReport;
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
  }


  setInDashboard() {
    this.inDashboard = this.router.url.includes('dashboard');
  }

  setValidation(report: IdbAccountReport) {
    let setupValid: boolean = this.accountReportsService.getSetupFormFromReport(report).valid;
    let betterPlantsValid: boolean = true;
    let dataOverviewValid: boolean = true;
    if (report.reportType == 'betterPlants') {
      betterPlantsValid = this.accountReportsService.getBetterPlantsFormFromReport(report.betterPlantsReportSetup).valid;
    } else if (report.reportType == 'dataOverview') {
      dataOverviewValid = this.accountReportsService.getDataOverviewFormFromReport(report.dataOverviewReportSetup).valid;
    }
    this.setupValid = (setupValid && betterPlantsValid && dataOverviewValid);
  }


}
import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
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
  constructor(private router: Router,
    private sharedDataService: SharedDataService,
    private accountReportsService: AccountReportsService,
    private accountReportDbService: AccountReportDbService) { }
  ngOnInit() {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInDashboard(event.url);
      }
    });
    this.setInDashboard(this.router.url);
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      if (val && !this.inDashboard) {
        this.setValidation(val);
      }
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.selectedReportSub.unsubscribe();
  }


  setInDashboard(url: string) {
    this.inDashboard = url.includes('dashboard');
  }

  setValidation(report: IdbAccountReport) {
    this.setupValid = this.accountReportsService.getSetupFormFromReport(report).valid;
  }


}

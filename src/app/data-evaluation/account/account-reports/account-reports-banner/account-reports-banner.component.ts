import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
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
  showDropdown: boolean = false;
  reportList: Array<IdbAccountReport>;
  reportListSub: Subscription;
  analysisVisited: boolean = false;
  selectedAnalysisItemSub: Subscription;

  constructor(private router: Router,
    private sharedDataService: SharedDataService,
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

    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
      if (val) {
        this.checkIfAnalysisVisited();
      }
    });

    this.reportListSub = this.accountReportDbService.accountReports.subscribe(reports => {
      this.reportList = reports;
    });

    this.selectedAnalysisItemSub = this.accountAnalysisDbService.selectedAnalysisItem.subscribe(analysisItem => {
      if (analysisItem) {
        this.checkIfAnalysisVisited();
      }
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.selectedReportSub.unsubscribe();
    this.reportListSub.unsubscribe();
    this.selectedAnalysisItemSub.unsubscribe();
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

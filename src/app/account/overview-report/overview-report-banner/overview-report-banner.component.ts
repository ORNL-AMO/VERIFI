import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbOverviewReportOptions } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-banner',
  templateUrl: './overview-report-banner.component.html',
  styleUrls: ['./overview-report-banner.component.css']
})
export class OverviewReportBannerComponent implements OnInit {

  inBasicReport: boolean;
  bannerTitle: string;
  modalOpen: boolean;
  modalOpenSub: Subscription;
  routerSub: Subscription;
  constructor(private overviewReportService: OverviewReportService, private router: Router,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    })
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInBasicReport(event.url);
      }
    });
    this.setInBasicReport(this.router.url);
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
  }

  goToDashboard() {
    this.router.navigateByUrl('/account/reports/dashboard');
  }

  goToMenu() {
    if (this.router.url.includes('basic-report')) {
      this.router.navigateByUrl('/account/reports/menu');
    } else {
      this.router.navigateByUrl('/account/reports/better-plants-menu');
    }
  }

  print() {
    this.overviewReportService.print.next(true);
  }

  setInBasicReport(url: string) {
    this.inBasicReport = url.includes('basic-report') || url.includes('better-plants-report');
  }

}

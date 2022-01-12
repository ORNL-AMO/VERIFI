import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbOverviewReportOptions } from 'src/app/models/idb';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-banner',
  templateUrl: './overview-report-banner.component.html',
  styleUrls: ['./overview-report-banner.component.css']
})
export class OverviewReportBannerComponent implements OnInit {

  inBasicReport: boolean;
  bannerTitle: string;
  constructor(private overviewReportService: OverviewReportService, private router: Router,
    private helpPanelService: HelpPanelService, private overviewReportOptionsDbService: OverviewReportOptionsDbService) { }

  ngOnInit(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInBasicReport(event.url);
      }
    });
    this.setInBasicReport(this.router.url);
  }

  goToDashboard() {
    this.router.navigateByUrl('/overview-report/report-dashboard');
  }

  goToMenu() {
    this.router.navigateByUrl('/overview-report/report-menu');
  }

  print() {
    this.overviewReportService.print.next(true);
  }

  setInBasicReport(url: string) {
    this.inBasicReport = url.includes('basic-report');
    if(this.inBasicReport){
      let selectedOptions: IdbOverviewReportOptions = this.overviewReportOptionsDbService.selectedOverviewReportOptions.getValue();
      this.bannerTitle = selectedOptions.name;
    }else{
      if(url.includes('report-menu')){
        this.bannerTitle = 'Report Options';
      }else if(url.includes('report-dashboard')){
        this.bannerTitle = 'Reports Dashboard'
      }
    }
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

}

import { Component, OnInit } from '@angular/core';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-account-analysis-footer',
  templateUrl: './account-analysis-footer.component.html',
  styleUrls: ['./account-analysis-footer.component.css']
})
export class AccountAnalysisFooterComponent implements OnInit {


  sidebarOpen: boolean;
  sidebarOpenSub: Subscription;
  helpPanelOpen: boolean;
  helpPanelOpenSub: Subscription;
  routerSub: Subscription;
  inDashboard: boolean;
  constructor(private sharedDataService: SharedDataService,
    private helpPanelService: HelpPanelService,
    private router: Router) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInDashboard(event.url);
      }
    });
    this.setInDashboard(this.router.url);
    this.sidebarOpenSub = this.sharedDataService.sidebarOpen.subscribe(val => {
      this.sidebarOpen = val;
    });

    this.helpPanelOpenSub = this.helpPanelService.helpPanelOpen.subscribe(val => {
      this.helpPanelOpen = val;
    })
  }

  ngOnDestroy() {
    this.sidebarOpenSub.unsubscribe();
    this.helpPanelOpenSub.unsubscribe();
  }

  setInDashboard(url: string) {
    this.inDashboard = url.includes('dashboard') || (url == '/account/analysis');
  }


  goBack() {

  }

  continue() {

  }

}

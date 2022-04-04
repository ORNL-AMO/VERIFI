import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-account-analysis-banner',
  templateUrl: './account-analysis-banner.component.html',
  styleUrls: ['./account-analysis-banner.component.css']
})
export class AccountAnalysisBannerComponent implements OnInit {

  inDashboard: boolean;
  modalOpenSub: Subscription;
  modalOpen: boolean;
  constructor(private router: Router, private helpPanelService: HelpPanelService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {    
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInDashboard(event.url);
      }
    });
    this.setInDashboard(this.router.url);
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    })
  }

  ngOnDestroy() {
    // this.analysisItemSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

  setInDashboard(url: string) {
    this.inDashboard = !url.includes('dashboard');
  }

  goToDashboard() {
    this.router.navigateByUrl('/analysis/dashboard')
  }
}

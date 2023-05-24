import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idb';
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

  accountAnalysisItem: IdbAccountAnalysisItem;
  accountAnalysisItemSub: Subscription;
  routerSub: Subscription;
  constructor(private router: Router,
    private sharedDataService: SharedDataService, private accountAnalysisDbService: AccountAnalysisDbService) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInDashboard(event.url);
      }
    });
    this.setInDashboard(this.router.url);
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.accountAnalysisItemSub = this.accountAnalysisDbService.selectedAnalysisItem.subscribe(val => {
      this.accountAnalysisItem = val;
    })

  }

  ngOnDestroy() {
    this.accountAnalysisItemSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
  }

  setInDashboard(url: string) {
    this.inDashboard = url.includes('dashboard') || (url == '/account/analysis');
  }

  goToDashboard() {
    this.router.navigateByUrl('/analysis/dashboard')
  }
}

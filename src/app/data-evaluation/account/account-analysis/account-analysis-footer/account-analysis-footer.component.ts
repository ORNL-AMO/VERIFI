import { Component, OnInit } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountAnalysisService } from '../account-analysis.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
  selector: 'app-account-analysis-footer',
  templateUrl: './account-analysis-footer.component.html',
  styleUrls: ['./account-analysis-footer.component.css'],
  standalone: false
})
export class AccountAnalysisFooterComponent implements OnInit {


  sidebarOpen: boolean;
  sidebarOpenSub: Subscription;
  routerSub: Subscription;
  inDashboard: boolean;
  showContinue: boolean;
  analysisItem: IdbAccountAnalysisItem;
  analysisItemSub: Subscription
  constructor(private sharedDataService: SharedDataService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private accountAnalysisService: AccountAnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService) { }

  ngOnInit(): void {

    this.analysisItemSub = this.accountAnalysisDbService.selectedAnalysisItem.subscribe(val => {
      this.analysisItem = val;
    });

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInDashboard(event.url);
        this.setShowContinue(event.url);
      }
    });
    this.setInDashboard(this.router.url);
    this.setShowContinue(this.router.url);
    this.sidebarOpenSub = this.sharedDataService.sidebarOpen.subscribe(val => {
      this.sidebarOpen = val;
    });
  }

  ngOnDestroy() {
    this.sidebarOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.analysisItemSub.unsubscribe();
  }

  setInDashboard(url: string) {
    this.inDashboard = url.includes('dashboard') || (url == '/account/analysis');
  }


  goBack() {
    if (this.router.url.includes('setup')) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard');
    } else if (this.router.url.includes('account/analysis/select-items')) {
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let selectedFacility: IdbFacility = this.accountAnalysisService.selectedFacility.getValue();
      let facilityIndex: number = facilities.findIndex(facility => { return facility.guid == selectedFacility.guid });
      if (facilityIndex == 0) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
      } else {
        this.accountAnalysisService.selectedFacility.next(facilities[facilityIndex - 1]);
      }
    } else if (this.router.url.includes('results')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
      } else {
        let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        this.accountAnalysisService.selectedFacility.next(facilities[facilities.length - 1]);
        this.router.navigateByUrl('/data-evaluation/account/analysis/select-items');
      }
    }
  }

  continue() {
    if (this.router.url.includes('setup')) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/select-items');
    } else if (this.router.url.includes('select-items')) {
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let selectedFacility: IdbFacility = this.accountAnalysisService.selectedFacility.getValue();
      let facilityIndex: number = facilities.findIndex(facility => { return facility.guid == selectedFacility.guid });
      if (facilityIndex == facilities.length - 1) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
      } else {
        this.accountAnalysisService.selectedFacility.next(facilities[facilityIndex + 1]);
      }
    } else if (this.router.url.includes('results')) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/results/monthly-analysis');
    }
  }

  setShowContinue(url: string) {
    if (url.includes('/results/monthly-analysis')) {
      this.showContinue = false;
    } else {
      this.showContinue = true;
    }
  }

  returnToDashboard() {
    this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard');
  }
}

import { Component, OnInit } from '@angular/core';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { AccountAnalysisService } from '../account-analysis.service';

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
    private router: Router,
    private facilityDbService: FacilitydbService,
    private accountAnalysisService: AccountAnalysisService) { }

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
    this.routerSub.unsubscribe();
  }

  setInDashboard(url: string) {
    this.inDashboard = url.includes('dashboard') || (url == '/account/analysis');
  }


  goBack() {
    if (this.router.url.includes('setup')) {
      this.router.navigateByUrl('account/analysis/dashboard');
    } else if (this.router.url.includes('account/analysis/select-items')) {
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let selectedFacility: IdbFacility = this.accountAnalysisService.selectedFacility.getValue();
      let facilityIndex: number = facilities.findIndex(facility => { return facility.guid == selectedFacility.guid });
      if (facilityIndex == 0) {
        this.router.navigateByUrl('/account/analysis/setup');
      } else {
        this.accountAnalysisService.selectedFacility.next(facilities[facilityIndex - 1]);
      }
    } else if (this.router.url.includes('results')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl('/account/analysis/results/annual-analysis');
      } else {
        let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        this.accountAnalysisService.selectedFacility.next(facilities[facilities.length - 1]);
        this.router.navigateByUrl('account/analysis/select-items');
      }
    }
  }

  continue() {
    if (this.router.url.includes('setup')) {
      this.router.navigateByUrl('account/analysis/select-items');
    } else if (this.router.url.includes('select-items')) {
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let selectedFacility: IdbFacility = this.accountAnalysisService.selectedFacility.getValue();
      let facilityIndex: number = facilities.findIndex(facility => { return facility.guid == selectedFacility.guid });
      if (facilityIndex == facilities.length - 1) {
        this.router.navigateByUrl('/account/analysis/results/annual-analysis');
      } else {
        this.accountAnalysisService.selectedFacility.next(facilities[facilityIndex + 1]);
      }
    } else if (this.router.url.includes('results')) {
      this.router.navigateByUrl('/account/analysis/results/monthly-analysis');
    }
  }

}

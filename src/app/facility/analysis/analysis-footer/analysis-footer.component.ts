import { Component, OnInit } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { NavigationEnd, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisService } from '../analysis.service';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountAnalysisService } from 'src/app/account/account-analysis/account-analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';

@Component({
  selector: 'app-analysis-footer',
  templateUrl: './analysis-footer.component.html',
  styleUrls: ['./analysis-footer.component.css']
})
export class AnalysisFooterComponent implements OnInit {

  sidebarOpen: boolean;
  sidebarOpenSub: Subscription;
  helpPanelOpen: boolean;
  helpPanelOpenSub: Subscription;
  analysisItem: IdbAnalysisItem;
  analysisItemSub: Subscription;
  selectedGroup: AnalysisGroup;
  selectedGroupSub: Subscription;

  routerSub: Subscription;
  showContinue: boolean;
  showGoBackToAccount: boolean;
  disableContinue: boolean = false;
  constructor(private sharedDataService: SharedDataService,
    private helpPanelService: HelpPanelService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisService: AccountAnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService) { }

  ngOnInit(): void {
    this.showGoBackToAccount = this.analysisService.accountAnalysisItem != undefined;
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setShowContinue();
      }
    });
    this.setShowContinue();

    this.sidebarOpenSub = this.sharedDataService.sidebarOpen.subscribe(val => {
      this.sidebarOpen = val;
    });

    this.helpPanelOpenSub = this.helpPanelService.helpPanelOpen.subscribe(val => {
      this.helpPanelOpen = val;
    });

    this.analysisItemSub = this.analysisDbService.selectedAnalysisItem.subscribe(val => {
      this.analysisItem = val;
      this.setDisableContinue();
    });

    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(val => {
      this.selectedGroup = val;
      this.setDisableContinue();
    });
  }

  ngOnDestroy() {
    this.sidebarOpenSub.unsubscribe();
    this.helpPanelOpenSub.unsubscribe();
    this.analysisItemSub.unsubscribe();
    this.selectedGroupSub.unsubscribe();
    this.routerSub.unsubscribe();
  }

  goBack() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityUrlStr: string = '/facility/' + facility.id + '/analysis/run-analysis/';
    if (this.router.url.includes('account-analysis')) {
      this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/monthly-analysis');
    } else if (this.router.url.includes('facility-analysis')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/annual-analysis');
      } else {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.analysisItem.groups[this.analysisItem.groups.length - 1].idbGroupId + '/monthly-analysis');
      }
    } else if (this.router.url.includes('group-analysis')) {
      if (this.router.url.includes('monthly-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/annual-analysis');
      } else if (this.router.url.includes('annual-analysis')) {
        if (this.selectedGroup.analysisType == 'regression') {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/model-selection');
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/options');
        }
      } else if (this.router.url.includes('model-selection')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/options');
      } else if (this.router.url.includes('options')) {
        let groupIndex: number = this.analysisItem.groups.findIndex(group => { return group.idbGroupId == this.selectedGroup.idbGroupId });
        if (groupIndex > 0) {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.analysisItem.groups[groupIndex - 1].idbGroupId + '/monthly-analysis');
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'analysis-setup');
        }
      }
    } else {
      this.router.navigateByUrl('/facility/' + facility.id + '/analysis/analysis-dashboard');
    }
  }

  continue() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityUrlStr: string = '/facility/' + facility.id + '/analysis/run-analysis/';
    if (this.router.url.includes('analysis-setup')) {
      this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.analysisItem.groups[0].idbGroupId + '/options');
    } else if (this.router.url.includes('group-analysis')) {
      if (this.router.url.includes('options')) {
        if (this.selectedGroup.analysisType == 'regression') {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/model-selection');
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/annual-analysis');
        }
      } else if (this.router.url.includes('model-selection')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/annual-analysis');
      } else if (this.router.url.includes('annual-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.selectedGroup.idbGroupId + '/monthly-analysis');
      } else {
        let groupIndex: number = this.analysisItem.groups.findIndex(group => { return group.idbGroupId == this.selectedGroup.idbGroupId });
        if (groupIndex < this.analysisItem.groups.length - 1) {
          this.router.navigateByUrl(facilityUrlStr + 'group-analysis/' + this.analysisItem.groups[groupIndex + 1].idbGroupId + '/options');
        } else {
          this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/annual-analysis');
        }
      }
    } else if (this.router.url.includes('facility-analysis')) {
      if (this.router.url.includes('annual-analysis')) {
        this.router.navigateByUrl(facilityUrlStr + 'facility-analysis/monthly-analysis');
      } else {
        this.router.navigateByUrl(facilityUrlStr + 'account-analysis');
      }
    }
  }

  setShowContinue() {
    this.showContinue = (this.router.url.includes('account-analysis') == false);
  }

  goBackToAccount() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.accountAnalysisService.selectedFacility.next(selectedFacility);
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.analysisService.accountAnalysisItem);
    this.router.navigateByUrl('/account/analysis/select-items')
  }

  setDisableContinue() {
    if (this.router.url.includes('analysis-setup')) {
      if (this.analysisItem.setupErrors.hasError) {
        this.disableContinue = true;
      } else {
        this.disableContinue = false;
      }
    } else if (this.router.url.includes('group-analysis') && this.selectedGroup) {
      if (this.router.url.includes('options')) {
        if (this.selectedGroup.groupErrors.hasErrors) {
          if (this.selectedGroup.groupErrors.invalidAverageBaseload || this.selectedGroup.groupErrors.invalidMonthlyBaseload
            || this.selectedGroup.groupErrors.missingGroupMeters || this.selectedGroup.groupErrors.noProductionVariables || this.selectedGroup.groupErrors.missingProductionVariables) {
            this.disableContinue = true;
          } else {
            this.disableContinue = false;
          }
        } else {
          this.disableContinue = false;
        }
      } else if (this.router.url.includes('model-selection')) {
        if (this.selectedGroup.groupErrors.hasErrors) {
          if (this.selectedGroup.groupErrors.missingRegressionConstant ||
            this.selectedGroup.groupErrors.missingRegressionModelYear ||
            this.selectedGroup.groupErrors.missingRegressionModelSelection ||
            this.selectedGroup.groupErrors.missingRegressionPredictorCoef) {
            this.disableContinue = true;
          } else {
            this.disableContinue = false;
          }
        } else {
          this.disableContinue = false;
        }
      }else{
        this.disableContinue = false;
      }
    }
  }

}

import { Component, OnInit } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { NavigationEnd, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisService } from '../analysis.service';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';

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
  canContinue: boolean;
  analysisItem: IdbAnalysisItem;
  analysisItemSub: Subscription;
  selectedGroup: AnalysisGroup;
  selectedGroupSub: Subscription;

  routerSub: Subscription;
  showContinue: boolean;
  constructor(private sharedDataService: SharedDataService,
    private helpPanelService: HelpPanelService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setShowContinue(event.url);
      }
    });
    this.setShowContinue(this.router.url);

    this.sidebarOpenSub = this.sharedDataService.sidebarOpen.subscribe(val => {
      this.sidebarOpen = val;
    });

    this.helpPanelOpenSub = this.helpPanelService.helpPanelOpen.subscribe(val => {
      this.helpPanelOpen = val;
    });

    this.analysisItemSub = this.analysisDbService.selectedAnalysisItem.subscribe(val => {
      this.analysisItem = val;
    });

    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(val => {
      this.selectedGroup = val;
    })
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

  setShowContinue(url: string) {
    this.showContinue = (url.includes('account-analysis') == false);
  }

}
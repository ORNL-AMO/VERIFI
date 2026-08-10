import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { Component, OnInit, inject, Injector } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AnalysisCategory } from 'src/app/models/analysis';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
  selector: 'app-analysis-dashboard',
  templateUrl: './analysis-dashboard.component.html',
  styleUrls: ['./analysis-dashboard.component.css'],
  standalone: false
})
export class AnalysisDashboardComponent implements OnInit {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  showDetailSub: Subscription;
  newAnalysisCategory: AnalysisCategory = 'energy';
  displayNewAnalysis: boolean = false;
  hasWater: boolean;
  hasEnergy: boolean;
  analysisType: 'Water' | 'Energy';
  routerSub: Subscription;
  compareAnalysisModal: boolean = false;
  facilityAnalysisItems: Array<IdbAnalysisItem>;
  selectedAnalysisItems: Array<IdbAnalysisItem> = [];
  showComparisonDetails: boolean = false;
  analysisItemsSub: Subscription;

  constructor(
    private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private analyticsService: AnalyticsService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setAnalysisType(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setAnalysisType(this.router.url);

    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(val => {
      this.selectedFacility = val;
      this.setHasEnergyAndWater();
    });

    this.analysisItemsSub = toObservable(this.accountWorkspaceStore.selectedFacilityAnalyses, { injector: this.injector }).subscribe(items => {
      this.facilityAnalysisItems = [...items];
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
    this.routerSub.unsubscribe();
  }

  async createAnalysis() {
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = [...this.accountWorkspaceStore.meterGroups()];
    let accountPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()];
    let newIdbItem: IdbAnalysisItem = getNewIdbAnalysisItem(account, this.selectedFacility, accountMeterGroups, accountPredictors, this.newAnalysisCategory);
    const { value: addedItem } = await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'add', label: 'Create Facility Analysis' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) }},
      () => this.analysisHandler.addFacilityAnalysis(newIdbItem, this.accountWorkspaceStore.account()?.guid)
    );
    this.analyticsService.sendEvent('create_facility_analysis', undefined)
    this.accountWorkspaceService.selectFacilityAnalysis(addedItem?.guid);
    this.toastNotificationService.showToast('New Analysis Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/run-analysis');
  }

  async openCreateAnalysis() {
    let inWater: boolean = this.router.url.includes('water');
    if (inWater) {
      this.newAnalysisCategory = 'water'
    } else {
      this.newAnalysisCategory = 'energy';
    }
    if (this.newAnalysisCategory == 'energy' && !this.hasEnergy) {
      this.newAnalysisCategory = 'water';
    } else if (this.newAnalysisCategory == 'water' && !this.hasWater) {
      this.newAnalysisCategory = 'energy';
    }
    if (this.hasEnergy && this.hasWater) {
      this.displayNewAnalysis = true;
    } else {
      await this.createAnalysis();
    }
  }

  cancelCreate() {
    this.displayNewAnalysis = false;
  }

  setHasEnergyAndWater() {
    let groups: Array<IdbUtilityMeterGroup> = [...this.accountWorkspaceStore.facilityMeterGroups()];
    this.hasEnergy = false;
    this.hasWater = false;
    let hasWater: boolean = false;
    let hasEnergy: boolean = false;
    groups.forEach(group => {
      if (group.groupType == 'Energy' && !this.hasEnergy) {
        hasEnergy = true;
      }
      if (group.groupType == 'Water' && !this.hasWater) {
        hasWater = true;
      }
    });
    this.hasWater = hasWater;
    this.hasEnergy = hasEnergy;
    //check nav
    if (this.analysisType == 'Energy' && !this.hasEnergy) {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/analysis-dashboard/water');
    }
    if (this.analysisType == 'Water' && !this.hasWater) {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/analysis-dashboard/energy');
    }
  }

  setAnalysisType(url: string) {
    if (url.includes('water')) {
      this.analysisType = 'Water';
    } else if (url.includes('energy')) {
      this.analysisType = 'Energy';
    }
  }

  openCompareAnalysis() {
    this.compareAnalysisModal = true;
  }

  closeComparisonModal() {
    this.compareAnalysisModal = false;
    this.selectedAnalysisItems = [];
    this.showComparisonDetails = false;
  }

  isSelected(analysisItem: IdbAnalysisItem): boolean {
    return this.selectedAnalysisItems.findIndex(item => item.id === analysisItem.id) > -1;
  }

  toggleSelectedAnalysisItem(analysisItem: IdbAnalysisItem) {
    this.showComparisonDetails = false;
    const index = this.selectedAnalysisItems.findIndex(item => item.id === analysisItem.id);
    if (index > -1) {
      this.selectedAnalysisItems.splice(index, 1);
    } else if (this.selectedAnalysisItems.length < 3) {
      this.selectedAnalysisItems.push(analysisItem);
    }
  }

  showDetails() {
    this.showComparisonDetails = true;
  }
}

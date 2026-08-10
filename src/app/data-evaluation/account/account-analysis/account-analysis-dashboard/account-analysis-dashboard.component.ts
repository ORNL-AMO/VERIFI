import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AnalysisCategory } from 'src/app/models/analysis';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { getNewIdbAccountAnalysisItem, IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-account-analysis-dashboard',
    templateUrl: './account-analysis-dashboard.component.html',
    styleUrls: ['./account-analysis-dashboard.component.css'],
    standalone: false
})
export class AccountAnalysisDashboardComponent implements OnInit {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);

  selectedAccount: IdbAccount;
  routerSub: Subscription;
  newAnalysisCategory: AnalysisCategory = 'energy';
  displayNewAnalysis: boolean = false;
  hasWater: boolean;
  hasEnergy: boolean;
  analysisType: 'Energy' | 'Water';
  constructor(
    private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private analyticsService: AnalyticsService
  ) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setAnalysisType(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setAnalysisType(this.router.url);
    this.selectedAccount = this.accountWorkspaceStore.account();
    this.setHasEnergyAndWater();
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }

  async createAnalysis() {
    let accountFacilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    let newItem: IdbAccountAnalysisItem = getNewIdbAccountAnalysisItem(this.newAnalysisCategory, this.selectedAccount, accountFacilities);
    const { value: addedItem } = await this.commandBoundary.execute(
      { entityKind: 'accountAnalysis', changeKind: 'add', label: 'Create Account Analysis' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountAnalyses', upsert: [value] }] }) }},
      () => this.analysisHandler.addAccountAnalysis(newItem, this.accountWorkspaceStore.account()?.guid)
    );
    this.analyticsService.sendEvent('create_account_analysis');
    this.accountWorkspaceService.selectAccountAnalysis((addedItem)?.guid);
    this.toastNotificationService.showToast('Analysis Item Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
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
    let groups: Array<IdbUtilityMeterGroup> = [...this.accountWorkspaceStore.meterGroups()];
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
      this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard/water');
    }
    if (this.analysisType == 'Water' && !this.hasWater) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard/energy');
    }
  }

  setAnalysisType(url: string) {
    if (url.includes('water')) {
      this.analysisType = 'Water';
    } else if (url.includes('energy')) {
      this.analysisType = 'Energy';
    }
  }
}

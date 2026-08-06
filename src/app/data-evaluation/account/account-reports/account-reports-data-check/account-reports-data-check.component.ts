import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityGroupAnalysisItem, RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

@Component({
  selector: 'app-account-reports-data-check',
  standalone: false,
  templateUrl: './account-reports-data-check.component.html',
  styleUrl: './account-reports-data-check.component.css',
})
export class AccountReportsDataCheckComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  selectedReport: IdbAccountReport;
  account: IdbAccount;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  facilityAnalysisItems: Array<IdbAnalysisItem> = [];
  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];
  facilityAnalysisItemsSub: Subscription;

  constructor(
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private regressionModelsService: RegressionModelsService
  ) { }

  ngOnInit(): void {
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    }
    this.account = this.accountWorkspaceStore.account();

    this.facilityAnalysisItemsSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityAnalyses()])).subscribe(items => {
      this.setFacilityItems(items);
    });
  }

  ngOnDestroy() {
    if (this.facilityAnalysisItemsSub) {
      this.facilityAnalysisItemsSub.unsubscribe();
    }
  }

  async setAnalysisVisited() {
    if (this.selectedAnalysisItem) {
      this.selectedAnalysisItem.isAnalysisVisited = true;
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(this.selectedAnalysisItem));
      await this.accountWorkspaceService.reloadActiveWorkspace(true);
      this.accountWorkspaceService.selectAccountAnalysis((this.selectedAnalysisItem)?.guid);
    }
  }

  setFacilityItems(allFacilityAnalysisItems: Array<IdbAnalysisItem>) {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = [...this.accountWorkspaceStore.accountAnalyses()];
    this.executiveSummaryItems = [];

    if (this.selectedReport.reportType == 'betterPlants') {
      this.selectedAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.betterPlantsReportSetup.analysisItemId });
    }
    else if (this.selectedReport.reportType == 'performance') {
      this.selectedAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.performanceReportSetup.analysisItemId });
    }
    else if (this.selectedReport.reportType == 'accountSavings') {
      this.selectedAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.accountSavingsReportSetup.analysisItemId });
    }

    this.facilityAnalysisItems = allFacilityAnalysisItems.filter(item => {
      const match = this.selectedAnalysisItem.facilityAnalysisItems.some(facilityItem => {
        return facilityItem.analysisItemId == item.guid;
      });
      return match;
    });

    this.initializeGroups();
    this.setAnalysisVisited();
  }

  initializeGroups() {
    this.executiveSummaryItems = [];
    this.facilityAnalysisItems.forEach(facilityAnalysisItem => {
      let facility: IdbFacility = this.accountWorkspaceStore.facilities().find(facility => facility.guid === (facilityAnalysisItem.facilityId));
      facilityAnalysisItem.groups.forEach(group => {
        if (group.analysisType == 'regression') {
          let groupItem: FacilityGroupAnalysisItem = this.regressionModelsService.getGroupModelItem(group, facility, facilityAnalysisItem, this.selectedReport.reportYear);
          if (groupItem) {
            this.executiveSummaryItems.push(groupItem);
          }
        } else if (group.analysisType != 'skip') {
          this.executiveSummaryItems.push({
            group: group,
            facilityId: facility.guid,
            baselineYear: facilityAnalysisItem.baselineYear,
            selectedModel: undefined
          });
        }
      });
    });
  }
}
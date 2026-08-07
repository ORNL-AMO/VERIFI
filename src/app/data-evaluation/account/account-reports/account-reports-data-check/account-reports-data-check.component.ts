import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, computed, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
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
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  selectedReport: IdbAccountReport;
  account: IdbAccount;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  facilityAnalysisItems: Array<IdbAnalysisItem> = [];
  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];
  facilityAnalysisItemsSub: Subscription;

  constructor(
    private router: Router,
    private regressionModelsService: RegressionModelsService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    }
    this.account = this.accountWorkspaceStore.account();

    this.facilityAnalysisItemsSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityAnalyses()]), { injector: this.injector }).subscribe(items => {
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
      const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
      await this.commandBoundary.execute(
        { entityKind: 'accountAnalysis', changeKind: 'update', entityGuid: this.selectedAnalysisItem.guid, label: 'Save Account Analysis' },
        () => this.analysisHandler.updateAccountAnalysis(this.selectedAnalysisItem, activeAccountGuid)
      );
      this.accountWorkspaceService.selectAccountAnalysis(this.selectedAnalysisItem?.guid);
    }
  }

  setFacilityItems(allFacilityAnalysisItems: Array<IdbAnalysisItem>) {
    this.executiveSummaryItems = [];

    if (this.selectedReport.reportType == 'betterPlants') {
      this.selectedAnalysisItem = this.accountWorkspaceQuery.getAccountAnalysisByGuid(this.selectedReport.betterPlantsReportSetup.analysisItemId);
    }
    else if (this.selectedReport.reportType == 'performance') {
      this.selectedAnalysisItem = this.accountWorkspaceQuery.getAccountAnalysisByGuid(this.selectedReport.performanceReportSetup.analysisItemId);
    }
    else if (this.selectedReport.reportType == 'accountSavings') {
      this.selectedAnalysisItem = this.accountWorkspaceQuery.getAccountAnalysisByGuid(this.selectedReport.accountSavingsReportSetup.analysisItemId);
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
      let facility: IdbFacility = this.accountWorkspaceQuery.getFacilityByGuid(facilityAnalysisItem.facilityId);
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

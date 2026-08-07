import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityGroupAnalysisItem, RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

@Component({
  selector: 'app-facility-reports-data-check',
  standalone: false,
  templateUrl: './facility-reports-data-check.component.html',
  styleUrl: './facility-reports-data-check.component.css',
})
export class FacilityReportsDataCheckComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);

  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;
  analysisItem: IdbAnalysisItem;

  constructor(
    private regressionModelsService: RegressionModelsService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.accountWorkspaceQuery.getFacilityAnalysisByGuid(this.facilityReport.analysisItemId);
      this.executiveSummaryItems = [];
      if (this.analysisItem) {
        this.initializeFacilityGroups();
        this.setAnalysisVisited();
      }
    });
  }

  ngOnDestroy() {
    if (this.facilityReportSub) {
      this.facilityReportSub.unsubscribe();
    }
  }

  initializeFacilityGroups() {
    let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    let reportYear: number;
    if (this.facilityReport.facilityReportType == 'analysis') {
      reportYear = this.facilityReport.analysisReportSettings.reportYear;
    } else if (this.facilityReport.facilityReportType == 'modeling') {
      reportYear = this.facilityReport.modelingReportSettings.reportYear;
    } else if (this.facilityReport.facilityReportType == 'savings') {
      reportYear = this.facilityReport.savingsReportSettings.endYear;
    } else if (this.facilityReport.facilityReportType == 'costSavings') {
      reportYear = this.facilityReport.costSavingsReportSettings.endYear;
    }

    this.analysisItem.groups.forEach(group => {
      if (group.analysisType == 'regression') {
        let groupItem: FacilityGroupAnalysisItem = this.regressionModelsService.getGroupModelItem(group, facility, this.analysisItem, reportYear);
        if (groupItem) {
          this.executiveSummaryItems.push(groupItem);
        }
      } else if (group.analysisType != 'skip') {
        this.executiveSummaryItems.push({
          group: group,
          facilityId: facility.guid,
          baselineYear: this.analysisItem.baselineYear,
          selectedModel: undefined
        });
      }
    });
  }

  async setAnalysisVisited() {
    if (this.analysisItem) {
      this.analysisItem.isAnalysisVisited = true;
      this.analysisItem.dataCheckedDate = new Date();
      const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
      await this.commandBoundary.execute(
        { entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: this.analysisItem.guid, label: 'Save Facility Analysis' },
        () => this.analysisHandler.updateFacilityAnalysis(this.analysisItem, activeAccountGuid)
      );
      this.accountWorkspaceService.selectFacilityAnalysis(this.analysisItem?.guid);
    }
  }
}

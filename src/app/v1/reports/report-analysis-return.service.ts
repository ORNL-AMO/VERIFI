import { Injectable, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { REPORT_ANALYSIS_ORIGIN_QUERY, readReportAnalysisOrigin, resolveReportAnalysisOrigin } from './report-analysis-origin';

/** Scoped to an analysis workbench so stage changes keep the originating report. */
@Injectable()
export class ReportAnalysisReturnService {
  private readonly requested = readReportAnalysisOrigin(inject(ActivatedRoute).snapshot.queryParamMap);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  readonly origin = computed(() => resolveReportAnalysisOrigin(this.requested, this.workspace.isReady() ? this.workspace.snapshot() : undefined));
  readonly queryParams = computed(() => {
    const origin = this.origin();
    return origin ? { [REPORT_ANALYSIS_ORIGIN_QUERY.accountGuid]: origin.accountGuid, [REPORT_ANALYSIS_ORIGIN_QUERY.reportGuid]: origin.reportGuid } : undefined;
  });

  async returnToReport(): Promise<boolean> {
    const origin = this.origin();
    return origin ? this.router.navigate(this.navigation.accountReportWorkbenchRoute(origin.accountGuid, origin.reportGuid)) : false;
  }
}

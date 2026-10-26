import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { SingleFacilityAnalysisPairService } from './single-facility-analysis-pair.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { reportStatusNavigationSource, resolveReportStatusItem } from '@app/v1/status/report-status-destination';
import { statusDestinationRoute } from '@app/v1/status/status-destination-route';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { readReportAnalysisOrigin, resolveReportAnalysisOrigin } from '@app/v1/shared/reports/report-analysis-origin';
import { parseWorkspaceRoute } from '@app/v1/shell/workspace-navigation.service';

export const singleFacilityAnalysisPairGuard: CanActivateChildFn = async (_route, state) => {
  const router = inject(Router);
  const requestedReport = readReportAnalysisOrigin(router.parseUrl(state.url).queryParamMap);
  if (requestedReport) {
    const workspace = inject(AccountWorkspaceStore);
    const snapshot = workspace.isReady() ? workspace.snapshot() : undefined;
    const target = parseWorkspaceRoute(state.url);
    // A report can open an owned analysis without selecting it or repairing hidden pairs.
    return !!resolveReportAnalysisOrigin(requestedReport, snapshot)
      && !!snapshot?.facilities.some(facility => facility.accountId === requestedReport.accountGuid && facility.guid === target.facilityGuid)
      && !!snapshot?.facilityAnalyses.some(analysis => analysis.accountId === requestedReport.accountGuid
        && analysis.facilityId === target.facilityGuid && analysis.guid === target.analysisGuid);
  }
  const source = reportStatusNavigationSource(router.currentNavigation()?.extras.state);
  if (source) {
    const workspace = inject(AccountWorkspaceStore);
    const item = resolveReportStatusItem(presentFinding(makeFinding('report.analysis.warning', 'warning', 'quality', source)),
      workspace.isReady() ? workspace.snapshot() : undefined);
    const route = statusDestinationRoute(item.destination);
    // Status drill-ins inspect the saved pair without the ordinary Analysis entry repair.
    if (item.destination.kind === 'facility-analysis' && route
      && router.serializeUrl(router.createUrlTree([...route])) === state.url.split(/[?#]/, 1)[0]) return true;
    return false;
  }
  await inject(SingleFacilityAnalysisPairService).ensurePairs();
  return true;
};

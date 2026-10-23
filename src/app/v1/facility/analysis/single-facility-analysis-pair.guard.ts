import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { SingleFacilityAnalysisPairService } from './single-facility-analysis-pair.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { reportStatusNavigationSource, resolveReportStatusItem } from '@app/v1/status/report-status-destination';
import { statusDestinationRoute } from '@app/v1/status/status-destination-route';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';

export const singleFacilityAnalysisPairGuard: CanActivateChildFn = async (_route, state) => {
  const router = inject(Router);
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

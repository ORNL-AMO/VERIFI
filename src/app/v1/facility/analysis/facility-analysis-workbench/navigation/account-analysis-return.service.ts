import { Injectable, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ACCOUNT_ANALYSIS_ORIGIN_QUERY } from '@app/v1/account/analysis/account-analysis-workbench/select-facility-items/account-analysis-facility-selection.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';

export interface AccountAnalysisReturnOrigin {
  readonly accountGuid: string;
  readonly accountAnalysisGuid: string;
  readonly facilityGuid: string;
  readonly resultTab?: 'facility-details' | 'facility-contributions';
}

@Injectable()
export class AccountAnalysisReturnService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly context = inject(FacilityAnalysisWorkbenchContext);
  private readonly requestedOrigin = readAccountAnalysisReturnOrigin(this.route.snapshot.queryParamMap);

  readonly origin = computed(() => {
    if (this.navigation.isSingleSiteWorkspace()) return undefined;
    const requested = this.requestedOrigin;
    const account = this.context.account();
    const facility = this.context.facility();
    if (!requested || !account || !facility
      || requested.accountGuid !== account.guid
      || requested.facilityGuid !== facility.guid
      || !this.context.workspace.accountAnalyses().some(item =>
        item.guid === requested.accountAnalysisGuid && item.accountId === requested.accountGuid
      )) return undefined;
    return requested;
  });

  async returnToAccountAnalysis(): Promise<boolean> {
    const origin = this.origin();
    if (!origin) return false;
    if (origin.resultTab) {
      return this.router.navigate(
        this.navigation.accountAnalysisResultsRoute(
          origin.accountGuid,
          origin.accountAnalysisGuid,
          origin.resultTab
        )
      );
    }
    return this.router.navigate(
      this.navigation.accountAnalysisWorkbenchRoute(
        origin.accountGuid,
        origin.accountAnalysisGuid,
        'select-items'
      ),
      { queryParams: { facilityGuid: origin.facilityGuid } }
    );
  }
}

export function readAccountAnalysisReturnOrigin(params: Pick<URLSearchParams, 'get'> | { get(name: string): string | null }): AccountAnalysisReturnOrigin | undefined {
  const accountGuid = params.get(ACCOUNT_ANALYSIS_ORIGIN_QUERY.accountGuid)?.trim();
  const accountAnalysisGuid = params.get(ACCOUNT_ANALYSIS_ORIGIN_QUERY.analysisGuid)?.trim();
  const facilityGuid = params.get(ACCOUNT_ANALYSIS_ORIGIN_QUERY.facilityGuid)?.trim();
  const resultTab = params.get(ACCOUNT_ANALYSIS_ORIGIN_QUERY.resultTab)?.trim();
  return accountGuid && accountAnalysisGuid && facilityGuid
    ? {
      accountGuid,
      accountAnalysisGuid,
      facilityGuid,
      ...(resultTab === 'facility-details' || resultTab === 'facility-contributions' ? { resultTab } : {})
    }
    : undefined;
}

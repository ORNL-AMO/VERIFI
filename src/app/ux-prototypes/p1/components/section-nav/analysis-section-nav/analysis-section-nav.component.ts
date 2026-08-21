import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { P1NavGroup, P1NavItem } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';
import { accountNavCounts, toneForNavCount } from '../section-nav-content';
import { toneForAnalysisStatus, toneForGroupStatus } from '../../../pages/facility-analysis-page/facility-analysis-workbench.helpers';

@Component({
  selector: 'app-p1-analysis-section-nav',
  templateUrl: './analysis-section-nav.component.html',
  standalone: false
})
export class P1AnalysisSectionNavComponent {
  readonly facade = inject(P1RouteFacade);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly statusChecks = inject(AccountStatusCheckService);
  private readonly facilityStatusCheck = toSignal(this.statusChecks.selectedFacilityStatusCheck$);
  private readonly analyses = computed(() => [...this.workspace.selectedFacilityAnalyses()]);
  private readonly accountAnalyses = computed(() => [...this.workspace.accountAnalyses()]);
  private readonly reports = computed(() => [...this.workspace.selectedFacilityReports()]);

  get groups(): Array<P1NavGroup> {
    if (this.facade.contextMode() === 'facility') {
      const facility = this.facade.selectedFacility();
      const analyses = this.analyses();
      const statusChecks = this.facilityStatusCheck()?.analysisStatusChecks ?? [];
      return [{
        title: 'Facility Analysis',
        items: [
          { id: 'dashboard', label: 'Dashboard', meta: `${facility?.analyses ?? analyses.length} items`, status: toneForNavCount(facility?.analyses ?? analyses.length) },
          ...analyses.map(analysis => {
            const status = statusChecks.find(check => check.analysisItem.guid === analysis.guid);
            const referenceCount = this.getReferenceCount(analysis.facilityId, analysis.guid);
            const children: P1NavItem[] = [
              {
                id: `${analysis.guid}-setup`,
                routeId: 'workbench',
                label: 'Setup',
                status: toneForAnalysisStatus(status),
                queryParams: { analysis: analysis.guid, step: 'setup' },
                activeQueryParams: { analysis: analysis.guid, step: 'setup', group: undefined }
              },
              ...analysis.groups.map(group => {
                const groupStatus = status?.getGroupStatusChecksByGroupId(group.idbGroupId);
                return {
                  id: `${analysis.guid}-group-${group.idbGroupId}`,
                  routeId: 'workbench',
                  label: this.workspaceQuery.getMeterGroupName(group.idbGroupId),
                  status: toneForGroupStatus(groupStatus),
                  queryParams: { analysis: analysis.guid, step: 'group-setup', group: group.idbGroupId },
                  activeQueryParams: { analysis: analysis.guid, group: group.idbGroupId }
                };
              }),
              {
                id: `${analysis.guid}-facility-results`,
                routeId: 'workbench',
                label: 'Results',
                status: status?.status === 'error' ? 'danger' : 'neutral',
                queryParams: { analysis: analysis.guid, step: 'facility-annual' },
                activeQueryParams: { analysis: analysis.guid, step: ['facility-annual', 'facility-monthly'], group: undefined }
              },
              {
                id: `${analysis.guid}-references`,
                routeId: 'workbench',
                label: 'Used By',
                meta: `${referenceCount} items`,
                status: referenceCount > 0 ? 'info' : 'neutral',
                queryParams: { analysis: analysis.guid, step: 'references' },
                activeQueryParams: { analysis: analysis.guid, step: ['references', 'account-analysis', 'reports'], group: undefined }
              }
            ];
            return {
              id: `analysis-${analysis.guid}`,
              routeId: 'workbench',
              label: analysis.name,
              meta: analysis.analysisCategory,
              status: toneForAnalysisStatus(status),
              queryParams: { analysis: analysis.guid, step: 'setup' },
              activeQueryParams: { analysis: analysis.guid },
              children
            };
          })
        ]
      }];
    }

    const counts = accountNavCounts(this.facade.accountFacilities());
    return [{
      title: 'Account Analysis',
      items: [
        { id: 'rollup', label: 'Account rollup', status: toneForNavCount(counts.facilities) },
        { id: 'savings', label: 'Savings summary' },
        { id: 'footprint-analysis', label: 'Footprint analysis' }
      ]
    }];
  }

  private getReferenceCount(facilityGuid: string, analysisGuid: string): number {
    const accountAnalysisCount = this.accountAnalyses().filter(accountAnalysis =>
      accountAnalysis.facilityAnalysisItems?.some(item =>
        item.facilityId === facilityGuid && item.analysisItemId === analysisGuid
      )
    ).length;
    const reportCount = this.reports().filter(report => report.analysisItemId === analysisGuid).length;
    return accountAnalysisCount + reportCount;
  }
}

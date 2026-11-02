import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { reportTypeAvailable } from '@app/v1/reports/report-availability';
import { reportIcon } from '@app/v1/reports/report-icons';
import { facilityAnalysisWorkbenchRoute, facilityReportWorkbenchRoute, parseWorkspaceRoute } from '@app/v1/routing/workspace-route';

type RecentItemSection = 'analysis' | 'reports';
interface RecentVisit { readonly guid: string; readonly facilityGuid: string; }
export interface RecentNavItem extends RecentVisit {
  readonly name: string;
  readonly facilityName: string;
  readonly label: string;
  readonly icon: IconName;
  readonly route: readonly string[];
}

/** Account-isolated, session-only shortcuts; successful visits never write workspace data. */
@Injectable({ providedIn: 'root' })
export class RecentItemsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);
  private readonly history = signal<ReadonlyMap<string, readonly RecentVisit[]>>(new Map());
  readonly analyses = computed(() => this.items('analysis'));
  readonly reports = computed(() => this.items('reports'));

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(event => { this.currentUrl.set(event.urlAfterRedirects); this.record(event.urlAfterRedirects); });
    // Also cover initial deep entry and workspace readiness after a successful route.
    effect(() => this.record(this.currentUrl()));
  }

  private record(url: string): void {
    const route = parseWorkspaceRoute(url);
    if (route.contextMode !== 'facility' || route.detail !== 'workbench' || !route.facilityGuid
      || (route.section !== 'analysis' && route.section !== 'reports')) return;
    if (this.workspace.status() !== 'ready') return;
    const accountGuid = this.workspace.account()?.guid, facilityGuid = route.facilityGuid;
    if (!accountGuid || !this.workspace.facilities().some(item => item.guid === facilityGuid && item.accountId === accountGuid)) return;
    const guid = route.section === 'analysis' ? route.analysisGuid : route.reportGuid;
    const entries = route.section === 'analysis' ? this.workspace.facilityAnalyses() : this.workspace.facilityReports();
    if (!guid || !entries.some(item => item.guid === guid && item.facilityId === facilityGuid && item.accountId === accountGuid)) return;
    const key = JSON.stringify([accountGuid, route.section]);
    untracked(() => this.history.update(history => {
      const recent = history.get(key) ?? [];
      if (recent[0]?.guid === guid && recent[0].facilityGuid === facilityGuid) return history;
      const next = new Map(history);
      next.set(key, [{ guid, facilityGuid }, ...recent.filter(item => item.guid !== guid || item.facilityGuid !== facilityGuid)].slice(0, 5));
      return next;
    }));
  }

  private items(section: RecentItemSection): readonly RecentNavItem[] {
    const account = this.workspace.account();
    if (!account) return [];
    const recent = this.history().get(JSON.stringify([account.guid, section])) ?? [];
    if (!recent.length || this.workspace.status() !== 'ready') return [];
    const facilities = this.workspace.facilities();
    return recent.flatMap(visit => {
      const facility = facilities.find(item => item.guid === visit.facilityGuid && item.accountId === account.guid);
      if (!facility) return [];
      const entries = section === 'analysis' ? this.workspace.facilityAnalyses() : this.workspace.facilityReports();
      const item = entries.find(item => item.guid === visit.guid && item.facilityId === facility.guid && item.accountId === account.guid);
      if (!item || ('facilityReportType' in item && !reportTypeAvailable(item.facilityReportType, account.displayEmissions))) return [];
      const name = item.name || (section === 'analysis' ? 'Untitled analysis' : 'Untitled report');
      const icon: IconName = 'facilityReportType' in item ? reportIcon(item) : 'analysis';
      return [{ ...visit, name, facilityName: facility.name, label: `${name}, ${facility.name}`, icon,
        route: section === 'analysis' ? facilityAnalysisWorkbenchRoute(facility.guid, item.guid)
          : facilityReportWorkbenchRoute(facility.guid, item.guid) }];
    });
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { combineLatest, filter, map } from 'rxjs';
import { FacilityEnergyUseRouteTab, facilityEnergyUseRoute } from '@app/v1/routing/workspace-route';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';

@Injectable()
export class EnergyUseWorkbenchContextService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly workspace = inject(EnergyUsesWorkspaceService);
  private readonly parameters = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly ownerGuid = toSignal(combineLatest(this.route.pathFromRoot.map(route => route.paramMap)).pipe(
    map(parameters => parameters.map(params => params.get('facilityGuid')).find(Boolean))
  ), { initialValue: this.route.pathFromRoot.map(route => route.snapshot.paramMap.get('facilityGuid')).find(Boolean) });
  readonly energyUseGuid = computed(() => this.parameters().get('energyUseGuid') ?? undefined);
  readonly facilityGuid = computed(() => this.ownerGuid() ?? undefined);
  readonly entry = computed(() => this.workspace.ready() ? this.workspace.entries().find(entry => entry.guid === this.energyUseGuid() && entry.facility.guid === this.facilityGuid()) : undefined);
  readonly notFound = computed(() => this.workspace.ready() && !this.entry());
  readonly resources = computed(() => this.workspace.ready() ? this.workspace.entries().filter(entry => entry.facility.guid === this.facilityGuid())
    .sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid))
    .map(entry => ({ id: entry.guid, label: entry.name, icon: 'tools' as const })) : []);
  private readonly activeTabState = signal<FacilityEnergyUseRouteTab>('settings');
  readonly activeTab = this.activeTabState.asReadonly();
  readonly navigationError = signal('');
  readonly inventoryLink = computed(() => {
    const account = this.workspace.account();
    return { route: account ? this.navigation.accountPortfolioRoute(account.guid, 'energy-uses') : ['/v1'],
      queryParams: this.navigation.isSingleSiteWorkspace() || !this.facilityGuid() ? {} : { facility: this.facilityGuid() } };
  });

  constructor() {
    this.syncTab();
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => this.syncTab());
  }
  openTab(tab: string): void {
    const entry = this.entry();
    if (entry && (tab === 'settings' || tab === 'annual-data')) this.navigate(facilityEnergyUseRoute(entry.facility.guid, entry.guid, tab));
  }
  switchResource(guid: string): void {
    if (this.resources().some(resource => resource.id === guid) && this.facilityGuid()) {
      this.navigate(facilityEnergyUseRoute(this.facilityGuid()!, guid, this.activeTab()));
    }
  }
  private syncTab(): void {
    this.activeTabState.set(this.route.firstChild?.snapshot?.data?.['energyUseTab'] === 'annual-data' ? 'annual-data' : 'settings');
  }
  private navigate(route: string[]): void {
    this.navigationError.set('');
    void this.router.navigate(route).catch(() => this.navigationError.set('The energy use could not be opened. Please try again.'));
  }
}

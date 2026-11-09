import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { facilityEnergyUseGroupRoute, facilityEnergyUseRoute } from '@app/v1/routing/workspace-route';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { EnergyUseWorkbenchHeaderService } from './energy-use-workbench-header.service';
import { EnergyUseWorkbenchSessionService } from './energy-use-workbench-session.service';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';

@Injectable()
export class EnergyUseWorkbenchContextService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly sessions = inject(EnergyUseWorkbenchSessionService);
  readonly workspace = inject(EnergyUsesWorkspaceService);
  private readonly header = inject(EnergyUseWorkbenchHeaderService, { optional: true });
  private readonly parameters = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  // A nested shell outlet can mount us after NavigationEnd has already fired.
  private readonly routeChanges = this.router.lastSuccessfulNavigation;
  private readonly ownerGuid = toSignal(combineLatest(this.route.pathFromRoot.map(route => route.paramMap)).pipe(
    map(parameters => parameters.map(params => params.get('facilityGuid')).find(Boolean))
  ), { initialValue: this.route.pathFromRoot.map(route => route.snapshot.paramMap.get('facilityGuid')).find(Boolean) });
  readonly energyUseGuid = computed(() => { this.routeChanges(); return this.route.firstChild?.snapshot.paramMap.get('energyUseGuid') ?? undefined; });
  readonly activeTab = computed<'items' | 'setup' | 'group-summary' | 'group-footprint' | 'facility-footprint'>(() => {
    this.routeChanges();
    const path = this.route.firstChild?.snapshot.url[0]?.path;
    return path === 'setup' || path === 'group-summary' || path === 'group-footprint' || path === 'facility-footprint' ? path : 'items';
  });
  readonly energyUseGroupGuid = computed(() => this.parameters().get('energyUseGroupGuid') ?? undefined);
  readonly facilityGuid = computed(() => this.ownerGuid() ?? undefined);
  readonly key = computed(() => JSON.stringify([this.workspace.account()?.guid, this.facilityGuid(), this.energyUseGroupGuid()]));
  readonly group = computed(() => this.workspace.groups().find(group => group.facility.guid === this.facilityGuid() && group.guid === this.energyUseGroupGuid()));
  readonly items = computed(() => [...(this.group()?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid)));
  /** Membership remains available through an editor's own committed refresh. */
  readonly item = computed(() => this.items().find(entry => entry.guid === this.energyUseGuid()));
  readonly entry = computed(() => {
    const entry = this.item(), editor = this.header?.editor(), account = this.workspace.account();
    const savingOwnChanges = entry && account && editor?.key() === `${account.guid}:${entry.facility.guid}:${entry.guid}` && editor.state() === 'saving';
    return this.workspace.ready() || (this.workspace.state() === 'loading' && savingOwnChanges) ? entry : undefined;
  });
  readonly notFound = computed(() => this.workspace.ready() && (!this.group() || (!!this.energyUseGuid() && !this.item())));
  readonly resources = computed(() => this.workspace.groups().filter(group => group.facility.guid === this.facilityGuid())
    .sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid))
    .map(group => ({ id: group.guid, label: group.name, icon: 'energyUseGroup' as const })));
  readonly groupLink = computed(() => this.facilityGuid() && this.energyUseGroupGuid()
    ? { route: facilityEnergyUseGroupRoute(this.facilityGuid()!, this.energyUseGroupGuid()!) } : this.inventoryLink());
  readonly navigationError = signal('');
  readonly inventoryLink = computed(() => {
    const account = this.workspace.account();
    return { route: account ? this.navigation.accountPortfolioRoute(account.guid, 'energy-uses') : ['/v1'],
      queryParams: this.navigation.isSingleSiteWorkspace() || !this.facilityGuid() ? {} : { facility: this.facilityGuid() } };
  });

  private resolvedLanding = '';

  constructor() {
    effect(() => {
      const accepted = this.routeChanges(), ready = this.workspace.ready(), guid = this.energyUseGuid(), item = this.item(), key = this.key(), items = this.items();
      if (!accepted || !ready || !this.group()) return;
      if (guid && item) this.sessions.remember(key, guid);
      const landing = JSON.stringify([accepted.id, key]);
      if (this.activeTab() === 'items' && !guid && landing !== this.resolvedLanding) {
        // Resolve each accepted landing once, including empty groups. A later creation
        // opens its explicit new member instead of racing a second default selection.
        this.resolvedLanding = landing;
        if (!items.length) return;
        const remembered = this.sessions.read(key), target = items.find(item => item.guid === remembered) ?? items[0];
        untracked(() => { void this.navigate(this.itemRoute(target.guid), true); });
      }
    });
  }
  itemRoute(guid: string): string[] { return facilityEnergyUseRoute(this.facilityGuid()!, this.energyUseGroupGuid()!, guid); }
  openItem(guid: string): void { if (this.items().some(item => item.guid === guid)) void this.navigate(this.itemRoute(guid)); }
  openTab(tab: string): void {
    if (tab === 'items' || tab === 'setup' || tab === 'group-summary' || tab === 'group-footprint' || tab === 'facility-footprint') void this.navigate([...this.groupLink().route, tab]);
  }
  switchResource(guid: string): void {
    if (this.resources().some(resource => resource.id === guid)) void this.navigate([...facilityEnergyUseGroupRoute(this.facilityGuid()!, guid), this.activeTab()]);
  }
  routeAfterRemoval(removed: readonly string[]): string[] {
    const items = this.items(), current = items.findIndex(item => item.guid === this.energyUseGuid());
    const next = items.slice(current + 1).find(item => !removed.includes(item.guid))
      ?? items.slice(0, Math.max(0, current)).reverse().find(item => !removed.includes(item.guid));
    return next ? this.itemRoute(next.guid) : [...this.groupLink().route, 'items'];
  }
  async navigate(route: string[], replaceUrl = false): Promise<boolean> {
    this.navigationError.set('');
    try { return await this.router.navigate(route, { replaceUrl }); }
    catch { this.navigationError.set('The energy use could not be opened. Please try again.'); return false; }
  }
}

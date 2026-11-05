import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { FacilityEnergyUseRouteTab, facilityEnergyUseGroupRoute, facilityEnergyUseRoute } from '@app/v1/routing/workspace-route';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { EnergyUseWorkbenchHeaderService } from './energy-use-workbench-header.service';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';

@Injectable()
export class EnergyUseWorkbenchContextService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly workspace = inject(EnergyUsesWorkspaceService);
  private readonly header = inject(EnergyUseWorkbenchHeaderService, { optional: true });
  private readonly parameters = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly ownerGuid = toSignal(combineLatest(this.route.pathFromRoot.map(route => route.paramMap)).pipe(
    map(parameters => parameters.map(params => params.get('facilityGuid')).find(Boolean))
  ), { initialValue: this.route.pathFromRoot.map(route => route.snapshot.paramMap.get('facilityGuid')).find(Boolean) });
  readonly energyUseGuid = computed(() => this.parameters().get('energyUseGuid') ?? undefined);
  readonly facilityGuid = computed(() => this.ownerGuid() ?? undefined);
  readonly entry = computed(() => {
    const entry = this.workspace.entries().find(entry => entry.guid === this.energyUseGuid() && entry.facility.guid === this.facilityGuid());
    const editor = this.header?.editor(), account = this.workspace.account();
    const savingOwnChanges = entry && account && editor?.key() === `${account.guid}:${entry.facility.guid}:${entry.guid}` && editor.state() === 'saving';
    // Keep the committed header mounted during this editor's save/reload, like the Meter and Predictor workbenches.
    return this.workspace.ready() || (this.workspace.state() === 'loading' && savingOwnChanges) ? entry : undefined;
  });
  readonly notFound = computed(() => this.workspace.ready() && !this.entry());
  readonly group = computed(() => this.workspace.groups().find(group => group.facility.guid === this.facilityGuid() && group.items.some(item => item.guid === this.energyUseGuid())));
  readonly groupLink = computed(() => this.group() ? { route: facilityEnergyUseGroupRoute(this.facilityGuid()!, this.group()!.guid) } : this.inventoryLink());
  readonly resources = computed(() => this.workspace.ready() || (this.workspace.state() === 'loading' && !!this.entry()) ? [...(this.group()?.items ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid))
    .map(entry => ({ id: entry.guid, label: entry.name, icon: entry.icon })) : []);
  readonly activeTab = signal<FacilityEnergyUseRouteTab>('settings').asReadonly();
  readonly navigationError = signal('');
  readonly inventoryLink = computed(() => {
    const account = this.workspace.account();
    return { route: account ? this.navigation.accountPortfolioRoute(account.guid, 'energy-uses') : ['/v1'],
      queryParams: this.navigation.isSingleSiteWorkspace() || !this.facilityGuid() ? {} : { facility: this.facilityGuid() } };
  });

  openTab(tab: string): void {
    const entry = this.entry();
    if (entry && tab === 'settings') this.navigate(facilityEnergyUseRoute(entry.facility.guid, entry.guid, tab));
  }
  switchResource(guid: string): void {
    if (this.resources().some(resource => resource.id === guid) && this.facilityGuid()) {
      this.navigate(facilityEnergyUseRoute(this.facilityGuid()!, guid, this.activeTab()));
    }
  }
  private navigate(route: string[]): void {
    this.navigationError.set('');
    void this.router.navigate(route).catch(() => this.navigationError.set('The energy use could not be opened. Please try again.'));
  }
}

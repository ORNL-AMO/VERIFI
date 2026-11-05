import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { InventoryHeaderActionsRegistry } from '@app/v1/data/inventory/inventory-header-actions.service';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { facilityEnergyUseRoute } from '@app/v1/routing/workspace-route';
import { InventoryTile } from '@app/v1/shared/inventory/inventory.models';
import { InventoryViewState } from '@app/v1/shared/inventory/inventory-view-state';
import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';
import { ENERGY_USE_FILTER_DEFAULTS, EnergyUseInventoryFilters, EnergyUseInventorySort, filterAndSortEnergyUses } from './energy-use-inventory.models';

@Component({
  selector: 'app-energy-uses-inventory',
  templateUrl: './energy-uses-inventory.component.html',
  styleUrls: ['./energy-uses-inventory.component.css'],
  standalone: false,
  providers: [EnergyUsesWorkspaceService]
})
export class EnergyUsesInventoryComponent {
  readonly workspace = inject(EnergyUsesWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly store = inject(AccountWorkspaceStore);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private portal?: TemplatePortal;
  @ViewChild('creationDrawer') private readonly creationDrawer?: TemplateRef<unknown>;
  readonly creating = signal(false);
  private creationIdentity?: string;
  readonly creationKey = computed(() => JSON.stringify([this.workspace.account()?.guid, this.navigation.inventoryFacilityGuid()]));
  readonly canCreate = computed(() => this.store.canWrite() && !this.store.hasPending() && this.store.facilities().some(facility => facility.accountId === this.workspace.account()?.guid));
  readonly navigationError = signal('');
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    category: new FormControl('all', { nonNullable: true }),
    lifecycle: new FormControl<EnergyUseInventoryFilters['lifecycle']>('all', { nonNullable: true }),
    sort: new FormControl<EnergyUseInventorySort>('name', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'energy-uses'> | undefined>(() => {
    const account = this.workspace.account();
    return account ? { kind: 'energy-uses', accountGuid: account.guid, facilityGuid: this.navigation.inventoryFacilityGuid() } : undefined;
  });
  readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly entries = computed(() => this.workspace.entries().filter(entry => !this.navigation.inventoryFacilityGuid() || entry.facility.guid === this.navigation.inventoryFacilityGuid()));
  readonly categories = computed(() => [...new Set([...this.entries().map(entry => entry.category), ...(this.filters().category === 'all' ? [] : [this.filters().category])])].sort());
  readonly filteredEntries = computed(() => filterAndSortEnergyUses(this.entries(), this.filters()));
  readonly tiles = computed<readonly InventoryTile[]>(() => this.filteredEntries().map(entry => ({
    guid: entry.guid, name: entry.name, icon: 'tools', chip: entry.category,
    route: facilityEnergyUseRoute(entry.facility.guid, entry.guid),
    owner: { facilityGuid: entry.facility.guid, label: entry.facility.name,
      ...this.navigation.facilityInventoryLink(entry.facility.guid, 'energy-uses') },
    status: { tone: 'neutral', icon: 'info', label: entry.availability }, energyUseSnapshot: entry.snapshot
  })));
  readonly inventory = new InventoryViewState(this.browseKey, this.tiles,
    computed(() => this.entries().map(entry => entry.guid)), this.filters, this.workspace.ready);
  readonly browseReady = computed(() => this.workspace.ready() && this.inventory.ready());
  constructor() {
    const registry = inject(InventoryHeaderActionsRegistry, { optional: true });
    const unregister = registry?.registerCreation({ resource: 'energy-uses', label: 'Add energy use', canCreate: this.canCreate, create: () => this.openCreation() });
    this.destroy.onDestroy(() => { unregister?.(); this.closeCreation(); });
    effect(() => { if (this.creating() && this.creationIdentity !== this.creationKey()) this.closeCreation(); });
  }
  openCreation(): void {
    if (!this.canCreate() || !this.creationDrawer) return;
    this.creationIdentity = this.creationKey(); this.creating.set(true);
    this.portal = new TemplatePortal(this.creationDrawer, this.view); this.modal.show(this.portal);
  }
  closeCreation(): void {
    this.creating.set(false);
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
  }
  async openCreated(item: IdbFacilityEnergyUseEquipment): Promise<void> {
    if (this.destroy.destroyed || this.creationIdentity !== this.creationKey() || item.accountId !== this.workspace.account()?.guid) return;
    this.closeCreation();
    try {
      const opened = await this.router.navigate(facilityEnergyUseRoute(item.facilityId, item.guid, 'settings'));
      if (!opened && !this.destroy.destroyed) this.navigationError.set('Energy use added. Open its settings from the inventory.');
    } catch { if (!this.destroy.destroyed) this.navigationError.set('Energy use added. Open its settings from the inventory.'); }
  }
  clearFilters(): void { this.filtersForm.reset(ENERGY_USE_FILTER_DEFAULTS); }
  navigateRoute(route: readonly string[]): void {
    this.navigationError.set('');
    void this.router.navigate([...route]).then(opened => {
      if (!opened) this.navigationError.set('The energy use could not be opened.');
    }).catch(() => this.navigationError.set('The energy use could not be opened. Please try again.'));
  }
}

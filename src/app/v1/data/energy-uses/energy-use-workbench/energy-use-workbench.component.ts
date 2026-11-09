import { Component, DestroyRef, ElementRef, Injector, TemplateRef, ViewChild, ViewContainerRef, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { FacilityEnergyUseResultsService } from './results/facility-footprint/facility-energy-use-results.service';
import { FacilityEnergyUseBalanceService } from './results/facility-footprint/facility-energy-use-balance.service';
import { TemplatePortal } from '@angular/cdk/portal';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { PageBreadcrumb } from '@app/v1/shared/page-identity/page-identity.component';
import { facilityContextBreadcrumbs } from '@app/v1/shared/page-identity/facility-context-breadcrumbs';
import { DataWorkbenchTab } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { EnergyUseWorkbenchHeaderService } from './energy-use-workbench-header.service';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';
import { EnergyUseWorkbenchContextService } from './energy-use-workbench-context.service';
import { EnergyUseResultsService } from './results/energy-use-results.service';
import { energyUseGroupHeader } from './energy-use-group-header.models';

@Component({
  selector: 'app-energy-use-workbench',
  host: { class: 'energy-use-workbench' },
  templateUrl: './energy-use-workbench.component.html',
  styleUrls: ['./energy-use-workbench.component.css'],
  standalone: false,
  providers: [EnergyUsesWorkspaceService, EnergyUseWorkbenchContextService, EnergyUseWorkbenchHeaderService, EnergyUseResultsService, FacilityEnergyUseResultsService, FacilityEnergyUseBalanceService]
})
export class EnergyUseWorkbenchComponent {
  private readonly stickyHeader = viewChild(BrowseHeaderDirective);
  private readonly factsToggle = viewChild(DataWorkbenchFactsToggleComponent);
  readonly context = inject(EnergyUseWorkbenchContextService);
  private readonly header = inject(EnergyUseWorkbenchHeaderService);
  readonly editor = computed(() => {
    if (this.context.activeTab() !== 'setup' && this.context.activeTab() !== 'items') return undefined;
    const account = this.context.workspace.account(), editor = this.header.editor();
    const target = this.context.activeTab() === 'setup' ? `group:${this.context.energyUseGroupGuid()}` : this.context.energyUseGuid();
    return account && editor?.key() === `${account.guid}:${this.context.facilityGuid()}:${target}` ? editor : undefined;
  });
  readonly summary = computed(() => energyUseGroupHeader(this.context.group()));
  readonly navigation = inject(WorkspaceNavigationService);
  readonly tabs: readonly DataWorkbenchTab[] = [
    { id: 'setup', label: 'Setup Group', icon: 'settings' },
    { id: 'items', label: 'Energy Use Items', icon: 'tools' },
    { id: 'group-summary', label: 'Group Summary', icon: 'barChartHorizontal' },
    { id: 'group-footprint', label: 'Group Footprint', icon: 'groupEnergyFootprint' },
    { id: 'facility-footprint', label: 'Facility Footprint', icon: 'facilityEnergyFootprint' }
  ];
  private readonly store = inject(AccountWorkspaceStore);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  private readonly changes = inject(UnsavedChangesService);
  private portal?: TemplatePortal;
  private creationKey?: string;
  private opener?: HTMLElement;
  readonly creating = signal(false);
  readonly canManage = computed(() => !!this.context.group() && this.store.canWrite() && !this.store.hasPending()
    && !this.editor()?.dirty() && !this.editor()?.blocked() && (!this.editor() || ['idle', 'saved'].includes(this.editor()!.state())));
  readonly canCreate = computed(() => this.canManage() && !this.context.group()?.unavailable);
  @ViewChild('creationDrawer') private readonly creationDrawer?: TemplateRef<unknown>;
  @ViewChild('itemNavigation', { read: ElementRef }) private readonly itemNavigation?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => { if (this.stickyHeader()?.collapsed()) untracked(() => this.factsToggle()?.collapse()); });
    this.destroy.onDestroy(this.header.registerCreation({ canCreate: this.canCreate, create: () => this.openCreation() }));
    effect(() => {
      const key = this.context.key();
      untracked(() => { if (this.creating() && key !== this.creationKey) this.closeCreation(); });
    });
    effect(() => {
      this.context.energyUseGuid(); this.context.items(); this.context.activeTab();
      afterNextRender(() => this.itemNavigation?.nativeElement.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }), { injector: this.injector });
    });
    this.destroy.onDestroy(() => this.closeCreation(false));
  }
  hasUnsavedChanges(): boolean { return this.changes.hasUnsavedChanges(); }
  isNavigationBlocked(): boolean { return this.editor()?.state() === 'saving' || !!this.editor()?.blocked() || this.modal.workspaceBlocked(); }
  openCreation(): void {
    if (!this.canCreate() || !this.creationDrawer) return;
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.creationKey = this.context.key(); this.creating.set(true);
    this.portal = new TemplatePortal(this.creationDrawer, this.view); this.modal.show(this.portal, { blockWorkspace: true });
  }
  closeCreation(restoreFocus = true): void {
    this.creating.set(false);
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
    if (restoreFocus && this.opener?.isConnected) this.opener.focus();
  }
  async openCreated(item: IdbFacilityEnergyUseEquipment): Promise<void> {
    if (this.creationKey !== this.context.key() || item.accountId !== this.store.account()?.guid || item.facilityId !== this.context.facilityGuid() || item.energyUseGroupId !== this.context.energyUseGroupGuid()) return;
    this.closeCreation();
    if (!await this.context.navigate(this.context.itemRoute(item.guid))) this.context.navigationError.set('Energy use added. Select it in Energy Use Items to open it.');
  }
  readonly breadcrumbs = computed<readonly PageBreadcrumb[]>(() => {
    const account = this.context.workspace.account(), group = this.context.group();
    return account && group ? facilityContextBreadcrumbs(this.navigation.isSingleSiteWorkspace(),
      { label: account.name, route: this.navigation.accountPortfolioRoute(account.guid, 'energy-uses') },
      { label: group.facility.name, ...this.context.inventoryLink() },
      { label: 'Energy Uses', icon: 'tools', ...this.context.inventoryLink() }
    ) : [];
  });
}

import { inventoryScopeBreadcrumbs } from '@app/v1/shared/page-identity/page-identity.component';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { InventoryTileActionRequest, InventoryTileMenuAction } from '@app/v1/shared/inventory/inventory.models';
import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { InventoryViewState } from '@app/v1/shared/inventory/inventory-view-state';
import { FACILITY_REPORT_TYPES } from '@app/v1/reports/facility/facility-report.models';
import { ReportLifecycleService } from '../report-lifecycle.service';
import { ACCOUNT_REPORT_TYPES, DEFAULT_REPORT_FILTERS, ReportInventoryFilters, buildReportInventory, filterReportInventory, reportInventoryTile } from '../report-inventory.models';
import { reportTypeAvailable } from '../report-availability';

@Component({ selector: 'app-reports-inventory', standalone: false, host: { class: 'v1-inventory-dashboard-host' }, providers: [ReportLifecycleService],
  templateUrl: './reports-inventory.component.html', styleUrls: ['./reports-inventory.component.css'] })
export class ReportsInventoryComponent {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  readonly lifecycle = inject(ReportLifecycleService);
  readonly browseKey = computed<BrowseKey<'reports'> | undefined>(() => {
    const account = this.workspace.account();
    const route = this.navigation.routeState();
    if (!account || this.workspace.status() !== 'ready') return undefined;
    return route.accountGuid === account.guid ? { kind: 'reports', accountGuid: account.guid, facilityGuid: this.navigation.inventoryFacilityGuid() } : undefined;
  });
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    scope: new FormControl<ReportInventoryFilters['scope']>('all', { nonNullable: true }),
    type: new FormControl('all', { nonNullable: true }),
    status: new FormControl<ReportInventoryFilters['status']>('all', { nonNullable: true }),
    sort: new FormControl<ReportInventoryFilters['sort']>('account-first', { nonNullable: true })
  });
  private readonly rememberedFilters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly scopedFacilityGuid = computed(() => this.navigation.inventoryFacilityGuid());
  readonly facilityOnly = computed(() => !!this.scopedFacilityGuid());
  readonly effectiveSort = new FormControl<ReportInventoryFilters['sort']>('account-first', { nonNullable: true });
  readonly filters = computed(() => {
    const filters = this.rememberedFilters();
    return { ...filters, ...(this.facilityOnly() ? { scope: 'facility' as const, sort: filters.sort === 'account-first' ? 'attention' as const : filters.sort } : {}) };
  });
  readonly entries = computed(() => {
    const snapshot = this.workspace.snapshot();
    const entries = snapshot && this.browseKey() ? buildReportInventory(snapshot, this.status.items(), this.status.state()) : [];
    return this.facilityOnly() ? entries.filter(entry => entry.scope === 'facility' && entry.facilityGuid === this.scopedFacilityGuid()) : entries;
  });
  readonly filteredEntries = computed(() => filterReportInventory(this.entries(), this.filters()));
  readonly tiles = computed(() => this.filteredEntries().map(entry => reportInventoryTile(entry, this.navigation)));
  private readonly setupSettled = computed(() => this.status.state() === 'ready' || this.status.state() === 'error');
  private readonly inventoryReady = computed(() => this.workspace.canWrite() && this.setupSettled());
  readonly inventory = new InventoryViewState(this.browseKey, this.tiles, computed(() => this.entries().map(entry => entry.key)), computed(() => ({ ...this.filters(), facility: this.scopedFacilityGuid() })), this.inventoryReady);
  readonly browseReady = computed(() => !!this.browseKey() && this.inventory.ready() && this.setupSettled());
  readonly canAct = computed(() => !!this.browseKey() && this.lifecycle.canAct() && !this.lifecycle.editor());
  readonly menuActions = computed<readonly InventoryTileMenuAction[]>(() => [
    { id: 'rename', label: 'Rename report', icon: 'edit', disabled: !this.canAct() },
    { id: 'copy', label: 'Copy report', icon: 'copy', disabled: !this.canAct() },
    { id: 'delete', label: 'Delete report', icon: 'delete', disabled: !this.canAct() }
  ]);
  readonly typeOptions = computed(() => [
    ...(!this.facilityOnly() ? ACCOUNT_REPORT_TYPES.map(option => ({ value: `account:${option.value}`, label: `Account · ${option.label}`, type: option.value })) : []),
    ...FACILITY_REPORT_TYPES.map(option => ({ value: `facility:${option.value}`, label: !this.facilityOnly() ? `Facility · ${option.label}` : option.label, type: option.value }))
  ].filter(option => reportTypeAvailable(option.type, this.workspace.account()?.displayEmissions)));
  readonly title = 'Reports';
  readonly breadcrumbs = computed(() => inventoryScopeBreadcrumbs(this.workspace.account()?.name || 'Account', this.workspace.facilities().find(item => item.guid === this.scopedFacilityGuid())?.name));
  readonly countLabel = computed(() => `${this.filteredEntries().length} of ${this.entries().length} reports`);
  readonly unavailable = computed(() => !this.workspace.account() || this.navigation.routeState().accountGuid !== this.workspace.account()?.guid);

  constructor() {
    const sortSubscription = this.effectiveSort.valueChanges.subscribe(value => this.filtersForm.controls.sort.setValue(value));
    inject(DestroyRef).onDestroy(() => sortSubscription.unsubscribe());
    effect(() => this.effectiveSort.setValue(this.filters().sort, { emitEvent: false }));
    effect(() => {
      const options = this.typeOptions();
      const filters = this.rememberedFilters();
      untracked(() => {
        const selectedType = filters.type;
        if (selectedType !== 'all' && !options.some(option => option.value === selectedType)) this.filtersForm.controls.type.setValue('all');
      });
    });
  }
  clearFilters(): void { this.filtersForm.reset({ ...DEFAULT_REPORT_FILTERS, sort: this.facilityOnly() ? 'attention' : 'account-first' }); }
  openCreate(): void { if (this.canAct()) this.lifecycle.openCreate(this.scopedFacilityGuid()); }
  requestAction(request: InventoryTileActionRequest): void {
    if (!this.canAct()) return;
    const entry = this.entries().find(item => item.key === request.guid);
    if (!entry) return;
    if (request.action === 'rename') this.lifecycle.rename(entry);
    if (request.action === 'copy') void this.lifecycle.copy(entry);
    if (request.action === 'delete') this.lifecycle.requestDelete(entry);
  }
  hasUnsavedChanges(): boolean { return this.lifecycle.draftChanged(); }
  isNavigationBlocked(): boolean { return this.lifecycle.navigationBlocked(); }
}

import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { InventoryTileActionRequest, InventoryTileMenuAction } from '@app/v1/shared/inventory/inventory.models';
import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { PortfolioInventoryState } from '@app/v1/account/data/portfolio/portfolio-inventory-state';
import { FACILITY_REPORT_TYPES } from '@app/v1/facility/reports/facility-report.models';
import { ReportLifecycleService } from '../report-lifecycle.service';
import { ACCOUNT_REPORT_TYPES, DEFAULT_REPORT_FILTERS, ReportInventoryFilters, ReportScope, buildReportInventory, filterReportInventory, reportInventoryTile } from '../report-inventory.models';
import { reportTypeAvailable } from '../report-availability';

@Component({ selector: 'app-reports-dashboard', standalone: false, host: { class: 'v1-inventory-dashboard-host' }, providers: [ReportLifecycleService],
  templateUrl: './reports-dashboard.component.html', styleUrls: ['./reports-dashboard.component.css'] })
export class ReportsDashboardComponent {
  readonly scope = input<ReportScope>('account');
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  readonly lifecycle = inject(ReportLifecycleService);
  readonly facility = computed(() => this.workspace.facilities().find(item => item.guid === this.navigation.routeState().facilityGuid && item.accountId === this.workspace.account()?.guid));
  readonly browseKey = computed<BrowseKey<'reports' | 'facilityReports'> | undefined>(() => {
    const account = this.workspace.account();
    const route = this.navigation.routeState();
    if (!account || this.workspace.status() !== 'ready') return undefined;
    return this.scope() === 'facility'
      ? this.facility() ? { kind: 'facilityReports', accountGuid: account.guid, facilityGuid: this.facility()!.guid } : undefined
      : route.accountGuid === account.guid ? { kind: 'reports', accountGuid: account.guid } : undefined;
  });
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    scope: new FormControl<ReportInventoryFilters['scope']>('all', { nonNullable: true }),
    type: new FormControl('all', { nonNullable: true }),
    status: new FormControl<ReportInventoryFilters['status']>('all', { nonNullable: true }),
    sort: new FormControl<ReportInventoryFilters['sort']>('account-first', { nonNullable: true })
  });
  private readonly rememberedFilters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly filters = computed(() => this.scope() === 'facility' ? { ...this.rememberedFilters(), scope: 'facility' as const } : this.rememberedFilters());
  readonly entries = computed(() => {
    const snapshot = this.workspace.snapshot();
    const entries = snapshot && this.browseKey() ? buildReportInventory(snapshot, this.status.items(), this.status.state()) : [];
    return this.scope() === 'facility' ? entries.filter(entry => entry.scope === 'facility' && entry.facilityGuid === this.facility()?.guid) : entries;
  });
  readonly filteredEntries = computed(() => filterReportInventory(this.entries(), this.filters()));
  readonly tiles = computed(() => this.filteredEntries().map(entry => reportInventoryTile(entry, this.navigation, this.scope() === 'account')));
  private readonly setupSettled = computed(() => this.status.state() === 'ready' || this.status.state() === 'error');
  private readonly inventoryReady = computed(() => this.workspace.canWrite() && this.setupSettled());
  readonly inventory = new PortfolioInventoryState(this.browseKey, this.tiles, computed(() => this.entries().map(entry => entry.key)), this.filters, this.inventoryReady);
  readonly layoutReady = signal(false);
  readonly browseReady = computed(() => !!this.browseKey() && this.inventory.ready() && this.setupSettled() && (!this.filteredEntries().length || this.layoutReady()));
  readonly canAct = computed(() => !!this.browseKey() && this.lifecycle.canAct() && !this.lifecycle.editor());
  readonly menuActions = computed<readonly InventoryTileMenuAction[]>(() => [
    { id: 'rename', label: 'Rename report', icon: 'edit', disabled: !this.canAct() },
    { id: 'copy', label: 'Copy report', icon: 'copy', disabled: !this.canAct() },
    { id: 'delete', label: 'Delete report', icon: 'delete', disabled: !this.canAct() }
  ]);
  readonly typeOptions = computed(() => [
    ...(this.scope() === 'account' ? ACCOUNT_REPORT_TYPES.map(option => ({ value: `account:${option.value}`, label: `Account · ${option.label}`, type: option.value })) : []),
    ...FACILITY_REPORT_TYPES.map(option => ({ value: `facility:${option.value}`, label: this.scope() === 'account' ? `Facility · ${option.label}` : option.label, type: option.value }))
  ].filter(option => reportTypeAvailable(option.type, this.workspace.account()?.displayEmissions)));
  readonly title = computed(() => this.scope() === 'facility' ? 'Reports' : `${this.workspace.account()?.name || 'Account'} Reports`);
  readonly breadcrumbs = computed(() => this.scope() === 'account'
    ? [{ label: this.workspace.account()?.name || 'Account' }, { label: 'Reports' }]
    : [{ label: this.workspace.account()?.name || 'Account', route: this.navigation.accountReportsRoute(this.workspace.account()?.guid ?? '') }, { label: this.facility()?.name || 'Facility' }]);
  readonly countLabel = computed(() => `${this.filteredEntries().length} of ${this.entries().length} reports`);
  readonly unavailable = computed(() => this.scope() === 'facility' ? !this.facility() : !this.workspace.account() || this.navigation.routeState().accountGuid !== this.workspace.account()?.guid);

  constructor() {
    effect(() => {
      const options = this.typeOptions();
      const facilityScope = this.scope() === 'facility';
      const filters = this.rememberedFilters();
      untracked(() => {
        if (facilityScope && filters.sort === 'account-first') this.filtersForm.controls.sort.setValue('attention');
        const selectedType = filters.type;
        if (selectedType !== 'all' && !options.some(option => option.value === selectedType)) this.filtersForm.controls.type.setValue('all');
      });
    });
  }
  clearFilters(): void { this.filtersForm.reset({ ...DEFAULT_REPORT_FILTERS, sort: this.scope() === 'facility' ? 'attention' : 'account-first' }); }
  openCreate(): void { if (this.canAct()) this.lifecycle.openCreate(this.scope() === 'facility' ? this.facility()?.guid : undefined); }
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

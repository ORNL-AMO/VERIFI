import { PageIdentityComponent, PageBreadcrumb } from '@app/v1/shared/page-identity/page-identity.component';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { BrowseKey, BrowseStateService, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, ElementRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { MeterCardView, MeterDraft } from '../models';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { MeterDraftSlideoutComponent } from './meter-dashboard-slideout/meter-draft-slideout/meter-draft-slideout.component';
import { MetersDashboardActionsService } from './meters-dashboard-actions.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { V1EChartsDataZoomRange } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterDirectoryComponent } from './meter-directory/meter-directory.component';
import { MonthlyTrendsComponent } from './monthly-trends/monthly-trends.component';
import { buildMeterChartStyles, MeterSeriesStyle, buildMeterDirectory, buildMonthlyTrends, MeterDirectoryActionRequest } from './meters-dashboard.view';

type StatusFilter = 'all' | 'attention' | 'noReadings' | 'missingGroup' | 'valid';
type MeterSort = 'attention' | 'meterName' | 'latestReading';

@Component({
  selector: 'app-meters-dashboard', standalone: true,
  templateUrl: './meters-dashboard.component.html', styleUrls: ['./meters-dashboard.component.css'],
  imports: [PageIdentityComponent, BrowseHeaderDirective, BrowsePositionDirective, ReactiveFormsModule, IconComponent, RouterLink, MeterDirectoryComponent, MonthlyTrendsComponent, MeterDraftSlideoutComponent, ConfirmationDialogComponent],
  providers: [MetersDashboardActionsService]
})
export class MetersDashboardComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly actions = inject(MetersDashboardActionsService);
  private readonly portal = inject(ModalPortalService);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sticky = viewChild(BrowseHeaderDirective);
  private readonly browseState = inject(BrowseStateService);
  @ViewChild('addMeterPanel') private readonly addMeterPanel!: TemplateRef<unknown>;
  @ViewChild('confirmation') private readonly confirmation!: TemplateRef<unknown>;
  @ViewChild('listDisplayToggle') private readonly listDisplayToggle?: ElementRef<HTMLButtonElement>;
  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl<StatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<MeterSort>('attention', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'facilityMeters'> | undefined>(() => {
    const account = this.workspace.account(), facility = this.workspace.facility();
    return account && facility ? { kind: 'facilityMeters', accountGuid: account.guid, facilityGuid: facility.guid } : undefined;
  });
  private readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly pageControl = new FormControl(1, { nonNullable: true });
  private readonly page = toSignal(this.pageControl.valueChanges, { initialValue: 1 });
  readonly pageSize = 8;
  readonly search = computed(() => this.filters().search ?? '');
  readonly statusFilter = computed(() => this.filters().status ?? 'all');
  readonly sortBy = computed(() => this.filters().sort ?? 'attention');
  readonly collapsed = computed(() => this.sticky()?.collapsed() ?? false);
  readonly listExpanded = signal(false);
  readonly addMeterOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly selecting = signal(false);
  readonly selected = signal<readonly string[]>([]);
  readonly emphasized = signal<string | undefined>(undefined);
  readonly zoomRange = signal<V1EChartsDataZoomRange>({ start: 0, end: 100 });
  readonly confirmationKind = signal<'copy' | 'delete' | undefined>(undefined);
  readonly targets = signal<readonly MeterCardView[]>([]);
  readonly targetReadingCount = computed(() => this.targets().reduce((sum, card) => sum + card.readingCount, 0));
  readonly confirmationTitle = computed(() => this.confirmationKind() === 'copy' ? `Copy ${this.targets()[0]?.meter.name ?? 'meter'}?`
    : this.targets().length === 1 ? `Delete ${this.targets()[0].meter.name}?` : `Delete ${this.targets().length} meters?`);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly breadcrumbs = computed<readonly PageBreadcrumb[]>(() => {
    const account = this.workspace.account(), facility = this.workspace.facility();
    return account && facility ? [{ label: account.name, route: this.navigation.accountDataReturnRoute(account.guid) }, { label: facility.name }] : [];
  });
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.workspace.statusState())
    && !['idle', 'loading'].includes(this.workspace.calendarizationState()));
  readonly browseIds = computed(() => this.visibleMeterCards().map(item => item.card.meter.guid));
  readonly chartStyles = linkedSignal<{ context: string; guids: readonly string[] }, ReadonlyMap<string, MeterSeriesStyle>>({
    source: () => ({ context: `${this.workspace.account()?.guid}/${this.workspace.facility()?.guid}`, guids: this.workspace.meterCards().map(card => card.meter.guid) }),
    computation: (source, previous) => buildMeterChartStyles(source.guids, previous?.source.context === source.context ? previous.value : undefined)
  });
  readonly meterCards = computed(() => buildMeterDirectory(this.workspace.meterCards(), this.workspace.meterData(),
    this.workspace.facilityCalendarizedMeters(), this.workspace.statusState(), this.chartStyles()));
  readonly filteredMeterCards = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.meterCards().filter(item => (!query || item.searchText.includes(query)) && (
      status === 'attention' ? item.needsAttention : status === 'noReadings' ? item.noReadings
        : status === 'missingGroup' ? item.missingGroup : status === 'valid' ? item.valid : true
    )).sort((a, b) => (this.sortBy() === 'attention' ? a.attentionRank - b.attentionRank
      : this.sortBy() === 'latestReading' ? b.latest - a.latest : 0)
      || a.card.meter.name.localeCompare(b.card.meter.name) || a.card.meter.guid.localeCompare(b.card.meter.guid));
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filteredMeterCards().length / this.pageSize)));
  readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  readonly showListFooter = computed(() => this.pageCount() > 1 || this.listExpanded());
  readonly pageStart = computed(() => this.filteredMeterCards().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0);
  readonly pageEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.filteredMeterCards().length));
  readonly visibleMeterCards = computed(() => this.listExpanded() ? this.filteredMeterCards()
    : this.filteredMeterCards().slice(this.pageStart() - 1, this.pageEnd()));
  readonly showWater = computed(() => this.meterCards().some(item => ['Water Intake', 'Water Discharge'].includes(item.card.meter.source)));
  readonly chartViews = computed(() => {
    const matching = new Set(this.filteredMeterCards().map(item => item.card.meter.guid));
    return buildMonthlyTrends(this.workspace.facilityCalendarizedMeters().filter(item => matching.has(item.meter.guid)), this.workspace.facility(), this.showWater(), this.chartStyles());
  });

  constructor() {
    effect(() => {
      const inventory = this.meterCards();
      const kind = this.confirmationKind();
      const saving = this.saving();
      untracked(() => {
        if (!kind || saving) return;
        const current = this.targets().map(target => inventory.find(entry => entry.card.meter.guid === target.meter.guid)?.card);
        if (current.some(card => !card)) {
          this.closePortal();
          this.actionError.set('The selected meters changed. Review the list and try again.');
        } else this.targets.set(current as MeterCardView[]);
      });
    });
    let previousContext = '';
    let previousFilter = '';
    let previousSort = '';
    let previousKey: BrowseKey<'facilityMeters'> | undefined;
    let previousView: { page: number; expanded: boolean; zoom: { start: number; end: number } } | undefined;
    effect(() => {
      const context = `${this.workspace.account()?.guid}/${this.workspace.facility()?.guid}`;
      const filter = `${this.search()}\0${this.statusFilter()}`;
      const sort = this.sortBy();
      const key = this.browseKey();
      const existing = new Set(this.meterCards().map(item => item.card.meter.guid));
      if (context !== previousContext) {
        this.listExpanded.set(false);
        this.selecting.set(false);
        this.selected.set([]);
        this.closePortal();
        this.actionError.set(undefined);
      } else if (filter !== previousFilter) {
        this.selected.set([]);
      } else {
        this.selected.update(selected => selected.filter(guid => existing.has(guid)));
      }
      if (context !== previousContext || filter !== previousFilter) {
        this.zoomRange.set({ start: 0, end: 100 });
        this.emphasized.set(undefined);
      }
      if (context !== previousContext || filter !== previousFilter || sort !== previousSort) this.pageControl.setValue(1);
      else if (this.page() > this.pageCount()) this.pageControl.setValue(this.pageCount());
      if (context !== previousContext) {
        if (previousKey && previousView) this.browseState.saveFacilityView(previousKey, previousView);
        const restored = key ? this.browseState.readFacilityView(key) : undefined;
        if (restored) {
          this.pageControl.setValue(Math.min(restored.page, this.pageCount()));
          this.listExpanded.set(restored.expanded);
          this.zoomRange.set(restored.zoom);
        }
      }
      previousKey = key;
      previousView = { page: this.currentPage(), expanded: this.listExpanded(), zoom: this.zoomRange() };
      previousContext = context;
      previousFilter = filter;
      previousSort = sort;
    });
    this.destroyRef.onDestroy(() => {
      if (previousKey) this.browseState.saveFacilityView(previousKey, { page: this.currentPage(), expanded: this.listExpanded(), zoom: this.zoomRange() });
    });
  }

  clearFilters(): void { this.filtersForm.patchValue({ search: '', status: 'all' }); }
  changePage(page: number): void {
    if (page < 1 || page > this.pageCount()) return;
    this.pageControl.setValue(page);
    this.emphasized.set(undefined);
  }
  toggleListExpanded(): void {
    this.listExpanded.update(expanded => !expanded);
    this.emphasized.set(undefined);
    if (!this.listExpanded()) this.listDisplayToggle?.nativeElement.focus();
  }
  startSelection(): void { if (this.canAct()) this.selecting.set(true); }
  cancelSelection(): void { if (!this.saving()) { this.selecting.set(false); this.selected.set([]); } }
  selectAll(): void { if (this.canAct()) this.selected.set(this.filteredMeterCards().map(item => item.card.meter.guid)); }
  changeSelection(change: { guid: string; selected: boolean }): void {
    if (!this.canAct() || !this.selecting()) return;
    this.selected.update(current => change.selected ? [...new Set([...current, change.guid])] : current.filter(guid => guid !== change.guid));
  }
  requestDeleteSelected(): void { this.requestConfirmation('delete', this.selected()); }
  handleAction(request: MeterDirectoryActionRequest): void {
    const meter = this.meterCards().find(item => item.card.meter.guid === request.guid)?.card.meter;
    if (!meter) return;
    if (request.action === 'settings' || request.action === 'readings') {
      void this.router.navigate(this.navigation.facilityMeterRoute(meter.facilityId, meter.guid, request.action)).catch(() => this.actionError.set('The meter could not be opened. Please try again.'));
    } else this.requestConfirmation(request.action, [request.guid]);
  }
  private requestConfirmation(kind: 'copy' | 'delete', guids: readonly string[]): void {
    if (!this.canAct() || !guids.length) return;
    const targets = guids.map(guid => this.meterCards().find(item => item.card.meter.guid === guid)?.card);
    if (targets.some(card => !card)) return;
    this.targets.set(targets as MeterCardView[]);
    this.confirmationKind.set(kind);
    this.actionError.set(undefined);
    this.portal.show(new TemplatePortal(this.confirmation, this.viewContainer));
  }
  openAddMeter(): void {
    if (!this.canAct()) return;
    this.addMeterOpen.set(true);
    this.actionError.set(undefined);
    this.portal.show(new TemplatePortal(this.addMeterPanel, this.viewContainer));
  }
  closeAddMeter(): void { if (!this.saving()) this.closePortal(); }
  closeConfirmation(): void { if (!this.saving()) this.closePortal(); }
  private closePortal(): void {
    if (this.addMeterOpen() || this.confirmationKind()) this.portal.hide();
    this.addMeterOpen.set(false);
    this.confirmationKind.set(undefined);
    this.targets.set([]);
  }
  async saveMeterDraft(draft: MeterDraft): Promise<void> {
    const facility = this.workspace.facility();
    if (!facility) return;
    await this.runAction(async isCurrent => {
      const meter = await this.actions.createMeter(draft, facility.guid);
      if (!isCurrent()) return;
      this.closePortal();
      if (meter.facilityId === this.workspace.facility()?.guid && meter.accountId === this.workspace.account()?.guid) {
        await this.router.navigate(this.navigation.facilityMeterRoute(meter.facilityId, meter.guid, 'settings'));
      }
    });
  }
  async confirmAction(): Promise<void> {
    const targets = this.targets();
    const kind = this.confirmationKind();
    if (!kind || !targets.length) return;
    await this.runAction(async isCurrent => {
      if (kind === 'copy') {
        const meter = await this.actions.copyMeter(targets[0].meter);
        if (!isCurrent()) return;
        this.closePortal();
        if (meter.facilityId === this.workspace.facility()?.guid && meter.accountId === this.workspace.account()?.guid) {
          await this.router.navigate(this.navigation.facilityMeterRoute(meter.facilityId, meter.guid, 'settings'));
        }
      } else {
        await this.actions.deleteMeters(targets.map(card => card.meter.guid));
        if (!isCurrent()) return;
        this.selected.set([]);
        this.selecting.set(false);
        this.closePortal();
      }
    });
  }
  private async runAction(action: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
    if (!this.canAct()) return;
    const context = `${this.workspace.account()?.guid}/${this.workspace.facility()?.guid}`;
    const isCurrent = () => !this.destroyRef.destroyed && context === `${this.workspace.account()?.guid}/${this.workspace.facility()?.guid}`;
    this.saving.set(true);
    this.actionError.set(undefined);
    try { await action(isCurrent); }
    catch (error) { if (isCurrent()) this.actionError.set(error instanceof Error ? error.message : 'The meter change could not be saved.'); }
    finally { if (!this.destroyRef.destroyed) this.saving.set(false); }
  }
  ngOnDestroy(): void { this.closePortal(); }
}

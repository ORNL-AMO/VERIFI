import { toSignal } from '@angular/core/rxjs-interop';
import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ReportType } from '@data/models/constantsAndTypes';
import { FacilityReportType } from '@data/models/idbModels/facilityReport';
import { AccountReportActionsService } from '@app/v1/reports/account/account-report-actions.service';
import { FacilityReportActionsService } from '@app/v1/reports/facility/facility-report-actions.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ReportInventoryEntry } from '../report-inventory.models';
import { ACCOUNT_REPORT_TYPES, FACILITY_REPORT_TYPES, reportDefinition } from '@app/v1/reports/catalog/report-catalog';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { ReportScope } from '@app/v1/reports/shared/report.models';
import { reportTypeAvailable } from '../../catalog/report-availability';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { isReportStatusItem, reportStatusNavigationState, resolveReportStatusItem } from '@app/v1/status/report-status-destination';
import { statusDestinationRoute } from '@app/v1/status/status-destination-route';

type ReportDraft = { name: string; scope: ReportScope | null; type: ReportType | FacilityReportType | null; facilityGuid: string };
export type ReportCreationStep = 'scope' | 'facility' | 'type' | 'name';
interface ReportEditor { readonly initial: ReportDraft; readonly fixedFacility?: string; readonly entry?: ReportInventoryEntry; }

/** Page-scoped lifecycle state shared by inventories and the account report landing. */
@Injectable()
export class ReportLifecycleService {
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly accountActions = inject(AccountReportActionsService);
  private readonly facilityActions = inject(FacilityReportActionsService);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly status = inject(WorkspaceStatusService);
  private readonly destroyRef = inject(DestroyRef);
  readonly saving = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly editor = signal<ReportEditor | undefined>(undefined);
  readonly deleteCandidate = signal<ReportInventoryEntry | undefined>(undefined);
  readonly confirmation = signal<'delete' | 'discard' | undefined>(undefined);
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    scope: new FormControl<ReportDraft['scope']>(null),
    type: new FormControl<ReportDraft['type']>(null),
    facilityGuid: new FormControl('', { nonNullable: true })
  });
  readonly step = signal<ReportCreationStep>('scope');
  readonly facilitySearch = new FormControl('', { nonNullable: true });
  private readonly search = toSignal(this.facilitySearch.valueChanges, { initialValue: '' });
  private suggestedName = '';
  private readonly draft = signal<ReportDraft>(this.form.getRawValue());
  readonly types = computed(() => {
    const scope = this.draft().scope;
    if (!scope) return [];
    return (scope === 'account' ? ACCOUNT_REPORT_TYPES : FACILITY_REPORT_TYPES)
      .filter(option => reportTypeAvailable(scope, option.value, this.workspace.account()?.displayEmissions))
      .map(option => ({ ...option, ...reportDefinition(scope, option.value)! }));
  });
  readonly facilities = computed(() => this.workspace.facilities().filter(item => item.accountId === this.workspace.account()?.guid)
    .slice().sort((a, b) => (a.name || '').localeCompare(b.name || '') || a.guid.localeCompare(b.guid)));
  readonly matchingFacilities = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    return this.facilities().filter(item => (item.name || 'Unnamed facility').toLocaleLowerCase().includes(search));
  });
  readonly selectedType = computed(() => this.types().find(option => option.value === this.draft().type));
  private readonly scopeValid = computed(() => this.draft().scope === 'account' ||
    (this.draft().scope === 'facility' && this.facilities().length > 0));
  private readonly ownerValid = computed(() => this.draft().scope === 'account' ||
    this.facilities().some(item => item.guid === this.draft().facilityGuid));
  readonly selections = computed(() => {
    const draft = this.draft(), fixed = !!this.editor()?.fixedFacility;
    const selections: { id: Exclude<ReportCreationStep, 'name'>; label: string; icon: IconName; editable: boolean; active: boolean }[] = [];
    if (draft.scope) selections.push({ id: 'scope', label: draft.scope === 'account' ? 'Account Report' : 'Facility Report',
      icon: draft.scope, editable: !fixed, active: this.step() === 'scope' });
    if (draft.scope === 'facility' && draft.facilityGuid) selections.push({ id: 'facility',
      label: this.facilities().find(item => item.guid === draft.facilityGuid)?.name || (this.ownerValid() ? 'Unnamed facility' : 'Facility unavailable'),
      icon: 'facility', editable: !fixed && (this.facilities().length > 1 || !this.ownerValid()), active: this.step() === 'facility' });
    if (draft.scope && draft.type) {
      const definition = reportDefinition(draft.scope, draft.type);
      selections.push({ id: 'type', label: definition?.label || 'Report type unavailable', icon: definition?.icon || 'report',
        editable: true, active: this.step() === 'type' });
    }
    return selections;
  });
  readonly contextKey = computed(() => {
    const route = this.navigation.routeState();
    return JSON.stringify([this.workspace.account()?.guid, route.accountGuid, route.facilityGuid, route.reportGuid, this.navigation.inventoryFacilityGuid()]);
  });
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly draftChanged = computed(() => !!this.editor() && JSON.stringify(this.draft()) !== JSON.stringify(this.editor()!.initial));
  readonly navigationBlocked = computed(() => this.saving() || this.draftChanged());
  private readonly fixedFacilityError = computed(() => {
    const fixed = this.editor()?.fixedFacility, draft = this.draft();
    return !!fixed && (draft.scope !== 'facility' || draft.facilityGuid !== fixed);
  });
  readonly availabilityError = computed(() => {
    if (!this.editor()) return undefined;
    const draft = this.draft();
    if (this.fixedFacilityError()) return 'Choose a report owned by the selected facility.';
    if (draft.scope === 'facility' && !this.facilities().length) return 'Add a facility before creating a facility report.';
    if (draft.facilityGuid && !this.ownerValid()) return 'This facility is no longer available. Select an available facility.';
    if (draft.type && !this.selectedType()) return 'This report type is no longer available. Select an available report type.';
    return undefined;
  });
  readonly canSave = computed(() => this.canAct() && !!this.editor() && !!this.draft().name.trim() &&
    this.scopeValid() && this.ownerValid() && !!this.selectedType() && !this.availabilityError() &&
    (!!this.editor()?.entry || this.step() === 'name'));

  constructor() {
    const unregister = inject(UnsavedChangesService).register(() => this.draftChanged(), () => this.cancelEditor(), () => this.navigationBlocked());
    this.destroyRef.onDestroy(unregister);
    const draftSubscription = this.form.valueChanges.subscribe(() => this.draft.set(this.form.getRawValue()));
    this.destroyRef.onDestroy(() => draftSubscription.unsubscribe());
    const subscription = this.form.controls.scope.valueChanges.subscribe(scope => {
      if (this.editor()?.entry) return;
      this.form.patchValue({ type: null, facilityGuid: scope === 'facility' && this.facilities().length === 1 ? this.facilities()[0].guid : '' });
      this.facilitySearch.setValue('');
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
    const typeSubscription = this.form.controls.type.valueChanges.subscribe(type => {
      if (this.editor()?.entry) return;
      const scope = this.form.controls.scope.value;
      const suggestion = scope && type ? `${reportDefinition(scope, type)?.label ?? 'New'} report` : '';
      if (!this.form.controls.name.dirty && this.form.controls.name.value === this.suggestedName) this.form.controls.name.setValue(suggestion);
      this.suggestedName = suggestion;
    });
    this.destroyRef.onDestroy(() => typeSubscription.unsubscribe());
    let previous = this.contextKey();
    effect(() => {
      const current = this.contextKey();
      if (current !== previous) untracked(() => {
        this.editor.set(undefined); this.deleteCandidate.set(undefined); this.confirmation.set(undefined); this.error.set(undefined);
      });
      previous = current;
    });
  }
  openCreate(facilityGuid?: string): void {
    if (!this.canAct() || this.editor()) return;
    this.startEditor({ name: '', scope: facilityGuid ? 'facility' : null, type: null, facilityGuid: facilityGuid ?? '' }, facilityGuid);
  }
  rename(entry: ReportInventoryEntry): void {
    if (!this.canAct() || this.editor()) return;
    this.startEditor({ name: entry.report.name, scope: entry.scope, type: entry.scope === 'account' ? entry.report.reportType : entry.report.facilityReportType,
      facilityGuid: entry.scope === 'facility' ? entry.facilityGuid : '' }, undefined, entry);
  }
  private startEditor(draft: ReportDraft, fixedFacility?: string, entry?: ReportInventoryEntry): void {
    this.error.set(undefined);
    this.suggestedName = '';
    this.facilitySearch.setValue('');
    this.form.reset(draft, { emitEvent: false });
    this.draft.set(this.form.getRawValue());
    this.editor.set({ initial: this.form.getRawValue(), fixedFacility, entry });
    this.step.set(fixedFacility ? 'type' : 'scope');
  }
  selectScope(scope: ReportScope): void {
    if (!this.canChoose() || this.editor()?.fixedFacility || (scope === 'facility' && !this.facilities().length)) return;
    if (this.form.controls.scope.value !== scope) this.form.controls.scope.setValue(scope);
    this.error.set(undefined);
    this.step.set(scope === 'facility' && !this.ownerValid() ? 'facility' : 'type');
  }
  selectFacility(guid: string): void {
    if (!this.canChoose() || this.editor()?.fixedFacility || this.form.controls.scope.value !== 'facility' ||
      !this.facilities().some(item => item.guid === guid)) return;
    if (this.form.controls.facilityGuid.value !== guid) this.form.controls.facilityGuid.setValue(guid);
    this.error.set(undefined);
    this.step.set('type');
  }
  selectType(type: ReportType | FacilityReportType): void {
    if (!this.canChoose() || !this.scopeValid() || !this.ownerValid() || this.fixedFacilityError() ||
      !this.types().some(item => item.value === type)) return;
    if (this.form.controls.type.value !== type) this.form.controls.type.setValue(type);
    this.error.set(undefined);
    this.step.set('name');
  }
  editSelection(id: Exclude<ReportCreationStep, 'name'>): void {
    if (this.canChoose() && this.selections().some(item => item.id === id && item.editable)) this.step.set(id);
  }
  private canChoose(): boolean { return this.canAct() && !!this.editor() && !this.editor()?.entry; }
  async submit(): Promise<void> {
    const editor = this.editor();
    if (!editor || !this.canSave()) return;
    const draft = this.form.getRawValue();
    await this.run(async isCurrent => {
      const entry = editor.entry;
      const report = entry
        ? entry.scope === 'account' ? await this.accountActions.updateName(entry.report.guid, draft.name)
          : await this.facilityActions.updateName(entry.facilityGuid, entry.report.guid, draft.name)
        : draft.scope === 'account' ? await this.accountActions.create(draft.name, draft.type as ReportType)
          : await this.facilityActions.create(draft.facilityGuid, draft.name, draft.type as FacilityReportType);
      if (!isCurrent()) return;
      this.editor.set(undefined);
      if (!entry) {
        this.saving.set(false);
        await this.navigate(draft.scope === 'account' ? this.navigation.accountReportWorkbenchRoute(report.accountId, report.guid)
          : this.navigation.facilityReportWorkbenchRoute(draft.facilityGuid, report.guid));
      }
    });
  }
  async copy(entry: ReportInventoryEntry): Promise<void> {
    if (this.editor()) return;
    await this.run(async isCurrent => {
      const report = entry.scope === 'account' ? await this.accountActions.copy(entry.report.guid) : await this.facilityActions.copy(entry.facilityGuid, entry.report.guid);
      if (!isCurrent()) return;
      this.saving.set(false);
      await this.navigate(entry.scope === 'account' ? this.navigation.accountReportWorkbenchRoute(report.accountId, report.guid)
        : this.navigation.facilityReportWorkbenchRoute(entry.facilityGuid, report.guid));
    });
  }
  requestDelete(entry: ReportInventoryEntry): void {
    if (!this.canAct() || this.editor()) return;
    this.error.set(undefined); this.deleteCandidate.set(entry); this.confirmation.set('delete');
  }
  async confirmDelete(): Promise<void> {
    const entry = this.deleteCandidate();
    if (!entry) return;
    await this.run(async isCurrent => {
      if (entry.scope === 'account') await this.accountActions.delete(entry.report.guid);
      else await this.facilityActions.delete(entry.facilityGuid, entry.report.guid);
      if (isCurrent()) { this.deleteCandidate.set(undefined); this.confirmation.set(undefined); }
    });
  }
  cancelEditor(): void { if (!this.saving()) { this.editor.set(undefined); this.error.set(undefined); } }
  requestClose(): void {
    if (this.saving()) return;
    if (this.draftChanged()) this.confirmation.set('discard'); else this.cancelEditor();
  }
  discardEditor(): void { this.cancelEditor(); this.cancelConfirmation(); }
  cancelConfirmation(): void { if (!this.saving()) { this.confirmation.set(undefined); this.deleteCandidate.set(undefined); } }
  async navigate(route: readonly string[]): Promise<void> {
    if (this.navigationBlocked()) return;
    // Analysis links in this inventory originate only from report findings.
    const analysisLink = route[4] === 'analysis';
    const finding = analysisLink ? this.status.items().filter(isReportStatusItem)
      .map(item => resolveReportStatusItem(item, this.workspace.isReady() ? this.workspace.snapshot() : undefined))
      .find(item => JSON.stringify(statusDestinationRoute(item.destination)) === JSON.stringify(route)) : undefined;
    if (analysisLink && !finding) return;
    const state = finding && reportStatusNavigationState(finding);
    try { if (!await (state ? this.router.navigate([...route], { state }) : this.router.navigate([...route]))) this.error.set('The report could not be opened. Finish any pending edits and try again.'); }
    catch { this.error.set('The report could not be opened. Please try again.'); }
  }
  private async run(action: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
    if (!this.canAct()) return;
    const key = this.contextKey();
    const isCurrent = () => !this.destroyRef.destroyed && key === this.contextKey();
    this.saving.set(true); this.error.set(undefined);
    try { await action(isCurrent); }
    catch (error) { if (isCurrent()) this.error.set(error instanceof Error ? error.message : 'The report could not be saved. Try again.'); }
    finally { if (!this.destroyRef.destroyed) this.saving.set(false); }
  }
}

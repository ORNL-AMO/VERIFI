import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ReportType } from '@data/models/constantsAndTypes';
import { FacilityReportType } from '@data/models/idbModels/facilityReport';
import { AccountReportActionsService } from '@app/v1/account/reports/account-report-actions.service';
import { FacilityReportActionsService } from '@app/v1/facility/reports/facility-report-actions.service';
import { FACILITY_REPORT_TYPES } from '@app/v1/facility/reports/facility-report.models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ACCOUNT_REPORT_TYPES, ReportInventoryEntry, ReportScope } from './report-inventory.models';
import { reportTypeAvailable } from './report-availability';

type ReportDraft = { name: string; scope: ReportScope; type: ReportType | FacilityReportType; facilityGuid: string };
interface ReportEditor { readonly initial: ReportDraft; readonly fixedFacility?: string; readonly entry?: ReportInventoryEntry; }

/** Page-scoped lifecycle state shared by inventories and the account report landing. */
@Injectable()
export class ReportLifecycleService {
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly accountActions = inject(AccountReportActionsService);
  private readonly facilityActions = inject(FacilityReportActionsService);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly saving = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly editor = signal<ReportEditor | undefined>(undefined);
  readonly deleteCandidate = signal<ReportInventoryEntry | undefined>(undefined);
  readonly confirmation = signal<'delete' | 'discard' | undefined>(undefined);
  readonly form = new FormGroup({
    name: new FormControl('New Report', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    scope: new FormControl<ReportScope>('account', { nonNullable: true }),
    type: new FormControl<ReportDraft['type']>('betterPlants', { nonNullable: true }),
    facilityGuid: new FormControl('', { nonNullable: true })
  });
  private readonly draft = signal<ReportDraft>(this.form.getRawValue());
  readonly types = computed(() => (this.draft().scope === 'account' ? ACCOUNT_REPORT_TYPES : FACILITY_REPORT_TYPES)
    .filter(option => reportTypeAvailable(option.value, this.workspace.account()?.displayEmissions)));
  readonly facilities = computed(() => this.workspace.facilities().filter(item => item.accountId === this.workspace.account()?.guid)
    .slice().sort((a, b) => (a.name || '').localeCompare(b.name || '') || a.guid.localeCompare(b.guid)));
  readonly contextKey = computed(() => {
    const route = this.navigation.routeState();
    return JSON.stringify([this.workspace.account()?.guid, route.accountGuid, route.facilityGuid, route.reportGuid]);
  });
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly draftChanged = computed(() => !!this.editor() && JSON.stringify(this.draft()) !== JSON.stringify(this.editor()!.initial));
  readonly navigationBlocked = computed(() => this.saving() || this.draftChanged());
  readonly availabilityError = computed(() => {
    if (!this.editor()) return undefined;
    const draft = this.draft();
    if (!this.editor()?.entry && !this.types().some(option => option.value === draft.type)) return 'Select an available report type.';
    if (draft.scope === 'facility' && !this.facilities().some(facility => facility.guid === draft.facilityGuid)) return 'Select an available facility.';
    if (this.editor()?.entry && !reportTypeAvailable(draft.type, this.workspace.account()?.displayEmissions)) return 'Enable Other Impacts in Account Goals to access this report type.';
    return undefined;
  });
  readonly canSave = computed(() => this.canAct() && !!this.draft().name.trim() && !this.availabilityError());

  constructor() {
    const unregister = inject(UnsavedChangesService).register(() => this.draftChanged(), () => this.cancelEditor(), () => this.navigationBlocked());
    this.destroyRef.onDestroy(unregister);
    const draftSubscription = this.form.valueChanges.subscribe(() => this.draft.set(this.form.getRawValue()));
    this.destroyRef.onDestroy(() => draftSubscription.unsubscribe());
    const subscription = this.form.controls.scope.valueChanges.subscribe(scope => {
      if (this.editor()?.entry) return;
      this.form.controls.type.setValue(scope === 'account' ? 'betterPlants' : 'analysis');
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
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
    this.startEditor({ name: 'New Report', scope: facilityGuid ? 'facility' : 'account', type: facilityGuid ? 'analysis' : 'betterPlants', facilityGuid: facilityGuid ?? '' }, facilityGuid);
  }
  rename(entry: ReportInventoryEntry): void {
    if (!this.canAct() || this.editor()) return;
    this.startEditor({ name: entry.report.name, scope: entry.scope, type: entry.scope === 'account' ? entry.report.reportType : entry.report.facilityReportType,
      facilityGuid: entry.scope === 'facility' ? entry.facilityGuid : '' }, undefined, entry);
  }
  private startEditor(draft: ReportDraft, fixedFacility?: string, entry?: ReportInventoryEntry): void {
    this.error.set(undefined);
    this.form.reset(draft, { emitEvent: false });
    this.draft.set(this.form.getRawValue());
    this.editor.set({ initial: this.form.getRawValue(), fixedFacility, entry });
  }
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
    try { if (!await this.router.navigate([...route])) this.error.set('The report could not be opened. Finish any pending edits and try again.'); }
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

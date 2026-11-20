import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisUsageCommands } from '@data/account-workspace/analysis-usage-commands.service';
import { AnalysisUsageReport, AnalysisUsageSource, AnalysisUsageTarget, analysisReportCompatible,
  analysisUsageSourceKey } from '@data/account-workspace/analysis-usage.models';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { reportDefinition, reportTypeChoices } from '@app/v1/reports/catalog/report-catalog';
import { accountAnalysisWorkbenchRoute, accountReportWorkbenchRoute, facilityReportWorkbenchRoute } from '@app/v1/routing/workspace-route';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { ANALYSIS_USAGE_HOST } from './analysis-usage-host';
import { buildAnalysisUsageView } from './analysis-usage.view';

type UsageAction = 'report' | 'account-analysis';
type UsageStep = 'type' | 'review';
interface UsageReview { readonly source: string; }
interface SavedDestination {
  readonly accountGuid: string; readonly route: readonly string[]; readonly queryParams?: Record<string, string>; readonly recover: boolean;
}

@Injectable()
export class AnalysisUsageService {
  readonly host = inject(ANALYSIS_USAGE_HOST);
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly commands = inject(AnalysisUsageCommands);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly editor = signal<UsageAction | undefined>(undefined);
  readonly step = signal<UsageStep>('type');
  readonly saving = signal(false);
  readonly opening = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly confirmDiscard = signal(false);
  readonly review = signal<UsageReview | undefined>(undefined);
  readonly saved = signal<SavedDestination | undefined>(undefined);
  private leaveResolution?: (leave: boolean) => void;
  readonly form = new FormGroup({
    type: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] })
  });
  private readonly draft = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly source = computed<AnalysisUsageSource | undefined>(() => {
    const analysis = this.host.analysis();
    const accountGuid = this.workspace.account()?.guid;
    if (!analysis || !accountGuid || analysis.accountId !== accountGuid) return undefined;
    return this.host.scope === 'facility' && 'facilityId' in analysis
      ? { scope: 'facility', accountGuid, analysisGuid: analysis.guid, facilityGuid: analysis.facilityId }
      : this.host.scope === 'account' ? { scope: 'account', accountGuid, analysisGuid: analysis.guid } : undefined;
  });
  readonly contextKey = computed(() => JSON.stringify(this.source()));
  readonly view = computed(() => buildAnalysisUsageView(this.workspace.snapshot(), this.source()));
  readonly singleFacility = computed(() => this.workspace.account()?.isSingleFacilityCompany === true
    && this.workspace.facilities().filter(item => item.accountId === this.workspace.account()?.guid).length === 1);
  readonly canAct = computed(() => !!this.source() && this.workspace.canWrite() && !this.workspace.hasPending()
    && !this.host.blocked() && !this.saving() && !this.opening());
  readonly showAccountAction = computed(() => this.source()?.scope === 'facility' && !this.singleFacility());
  readonly reportTypes = computed(() => {
    const source = this.source(), analysis = this.host.analysis();
    if (!source || !analysis) return [];
    return reportTypeChoices(this.singleFacility(), this.workspace.account()?.displayEmissions).filter(choice =>
      (source.scope === 'account' ? choice.scope === 'account' : choice.scope === 'facility' || this.singleFacility())
      && analysisReportCompatible(choice.scope, choice.type, analysis))
      .map(choice => ({ ...choice, label: this.singleFacility() ? choice.label : choice.typeLabel, icon: reportDefinition(choice.scope, choice.type)!.icon,
        pending: !reportDefinition(choice.scope, choice.type)!.contentImplemented }));
  });
  readonly reportUnavailable = computed(() => !this.reportTypes().length
    ? 'Account reports require a source energy or water analysis.' : undefined);
  readonly selectedType = computed(() => this.reportTypes().find(choice => choice.value === this.draft().type));
  readonly title = computed(() => this.editor() === 'account-analysis' ? 'Add Account Analysis' : 'Add Report');
  readonly accountBaseline = computed(() => this.host.analysis()?.baselineYear);
  readonly reviewCurrent = computed(() => {
    const review = this.review(), analysis = this.host.analysis();
    return !!review && !!analysis && review.source === analysisUsageSourceKey(analysis);
  });
  readonly creationRequirement = computed(() => this.editor() === 'account-analysis'
    && !Number.isInteger(this.host.analysis()?.baselineYear) ? 'Set a baseline year on the facility analysis before creating an account analysis.' : undefined);
  readonly canSave = computed(() => this.canAct() && !!this.editor() && this.step() === 'review' && this.reviewCurrent()
    && (this.editor() !== 'report' || !!this.selectedType()) && !this.saved() && !this.creationRequirement()
    && !!this.draft().name?.trim());
  readonly dirty = computed(() => !!this.editor() && !this.saved() &&
    (!!this.draft().type || this.draft().name !== (this.editor() === 'account-analysis' ? 'Account Analysis' : '')));
  readonly selections = computed(() => {
    const type = this.selectedType();
    const choices: { step: UsageStep; label: string; icon: IconName }[] = [];
    if (type && this.editor() === 'report') choices.push({ step: 'type', label: type.label, icon: type.icon });
    return choices;
  });

  constructor() {
    const unsaved = inject(UnsavedChangesService);
    this.destroyRef.onDestroy(unsaved.register(() => this.dirty(), () => this.close(), () => this.saving()));
    this.destroyRef.onDestroy(unsaved.protectBeforeUnload(computed(() => this.dirty() || this.saving())));
    let context = this.contextKey();
    effect(() => {
      const next = this.contextKey();
      if (next !== context) untracked(() => this.reset());
      context = next;
    });
  }

  async open(action: UsageAction): Promise<void> {
    if (!this.canAct() || this.editor() || action === 'account-analysis' && !this.showAccountAction()
      || action === 'report' && !this.reportTypes().length) return;
    const key = this.contextKey();
    this.opening.set(true);
    try {
      if (!await this.host.flush() || key !== this.contextKey() || this.destroyRef.destroyed) return;
      this.form.reset({ type: '', name: action === 'account-analysis' ? 'Account Analysis' : '' });
      this.error.set(undefined); this.saved.set(undefined);
      this.review.set(action === 'account-analysis' ? { source: analysisUsageSourceKey(this.host.analysis()!) } : undefined);
      this.step.set(action === 'account-analysis' ? 'review' : 'type'); this.editor.set(action);
    } finally { this.opening.set(false); }
  }
  chooseType(value: string): void {
    if (!this.canChoose() || !this.reportTypes().some(item => item.value === value)) return;
    const changed = this.form.controls.type.value !== value;
    this.form.controls.type.setValue(value); this.error.set(undefined);
    if (changed || !this.form.controls.name.value.trim()) this.form.controls.name.setValue(`${this.selectedType()!.typeLabel} report`);
    this.refreshReview();
  }
  editSelection(step: UsageStep): void { if (this.canChoose()) this.step.set(step); }
  refreshReview(): void {
    if (!this.canChoose()) return;
    const analysis = this.host.analysis();
    if (!analysis) return;
    if (this.editor() === 'report' && !this.selectedType()) { this.step.set('type'); this.review.set(undefined); return; }
    this.review.set({ source: analysisUsageSourceKey(analysis) });
    this.step.set('review'); this.error.set(undefined);
  }
  requestClose(): void {
    if (this.saving() || this.opening()) return;
    if (this.dirty()) this.confirmDiscard.set(true); else this.close();
  }
  async resolveLeave(): Promise<boolean> {
    if (this.saving() || this.opening() && !this.saved()) return false;
    if (!this.dirty()) return this.host.flush();
    if (this.leaveResolution) return false;
    this.confirmDiscard.set(true);
    return new Promise<boolean>(resolve => { this.leaveResolution = resolve; });
  }
  cancelDiscard(): void { this.confirmDiscard.set(false); this.leaveResolution?.(false); this.leaveResolution = undefined; }
  close(): void {
    if (this.saving()) return;
    const resolve = this.leaveResolution; this.leaveResolution = undefined;
    this.reset(); resolve?.(true);
  }
  private reset(): void {
    this.leaveResolution?.(false); this.leaveResolution = undefined;
    this.editor.set(undefined); this.confirmDiscard.set(false); this.review.set(undefined); this.saved.set(undefined); this.error.set(undefined);
  }
  private canChoose(): boolean { return !!this.editor() && this.canAct() && !this.saved(); }

  async submit(): Promise<void> {
    this.form.controls.name.markAsTouched();
    if (!this.canSave()) return;
    const source = this.source()!, review = this.review()!, type = this.selectedType(), action = this.editor()!;
    const key = this.contextKey();
    const target: AnalysisUsageTarget = { kind: 'new', guid: getNewIdbEntry().guid, name: this.form.controls.name.value.trim() };
    const destination: SavedDestination = { accountGuid: source.accountGuid, recover: false,
      route: action === 'account-analysis' ? accountAnalysisWorkbenchRoute(source.accountGuid, target.guid, 'select-items')
        : type!.scope === 'account' ? accountReportWorkbenchRoute(source.accountGuid, target.guid)
          : facilityReportWorkbenchRoute(source.scope === 'facility' ? source.facilityGuid : '', target.guid),
      ...(action === 'account-analysis' && source.scope === 'facility' ? { queryParams: { facilityGuid: source.facilityGuid } } : {}) };
    this.saving.set(true); this.error.set(undefined);
    let committed = false;
    try {
      if (!await this.host.flush() || key !== this.contextKey() || this.destroyRef.destroyed) return;
      const command = { source, expectedSource: review.source, target };
      if (action === 'account-analysis') await this.commands.saveAccountAnalysis(command);
      else {
        const report: AnalysisUsageReport = type!.scope === 'account' ? { scope: 'account', type: type!.type }
          : { scope: 'facility', type: type!.type, facilityGuid: source.scope === 'facility' ? source.facilityGuid : '' };
        await this.commands.saveReport({ ...command, report });
      }
      committed = true;
      if (key === this.contextKey() && !this.destroyRef.destroyed) this.saved.set(destination);
    } catch (error) {
      if (key !== this.contextKey() || this.destroyRef.destroyed) return;
      if (error instanceof WorkspaceWriteError && error.persistenceCommitted) {
        this.saved.set({ ...destination, recover: true });
        this.error.set('Your changes were saved. Refresh the saved changes before opening the destination.');
      } else this.error.set(error instanceof Error ? error.message : 'The item could not be created. Try again.');
    } finally { this.saving.set(false); }
    if (committed && key === this.contextKey() && !this.destroyRef.destroyed) await this.openSaved();
  }
  async openSaved(): Promise<void> {
    const destination = this.saved();
    if (!destination || this.saving() || this.opening()) return;
    const key = this.contextKey();
    this.opening.set(true); this.error.set(undefined);
    try {
      if (destination.recover) await this.boundary.recoverCommittedPublication(destination.accountGuid);
      if (!await this.host.flush() || key !== this.contextKey() || this.destroyRef.destroyed) return;
      this.saved.set({ ...destination, recover: false });
      if (!await this.router.navigate([...destination.route], { queryParams: destination.queryParams })) {
        this.error.set('Your changes are saved, but the destination could not be opened. Try opening it again.');
      } else if (!this.destroyRef.destroyed) this.reset();
    } catch { if (key === this.contextKey()) this.error.set('Your changes are saved. Try opening the destination again.'); }
    finally { this.opening.set(false); }
  }
}

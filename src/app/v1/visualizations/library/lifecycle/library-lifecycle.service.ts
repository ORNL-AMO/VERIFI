import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { VisualizationCommand, VisualizationCommandOutcome } from '@data/account-workspace/visualization-commands.models';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { createVisualizationSetupDefinition, VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { VisualizationNavigationService } from '../../visualization-navigation.service';
import { VisualizationLibraryEntry } from '../visualization-library.models';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { VISUALIZATION_CHART_CHOICES, VisualizationChartChoiceId, createVisualizationChart } from '../../visualization-charts';
import { VISUALIZATION_FAMILIES } from '../../visualization-families';

export type VisualizationCreationStep = 'scope' | 'facility' | 'chart' | 'families' | 'name';
export interface VisualizationCreationDraft {
  name: string; scope: 'portfolio' | 'facility'; facilityGuid: string;
  chart: VisualizationChartChoiceId | null; families: readonly VisualizationSourceKind[];
}
interface CreationSelection { readonly step: VisualizationCreationStep; readonly label: string; readonly icon: IconName; readonly editable: boolean; }
interface LibraryEditor { readonly initial: VisualizationCreationDraft; readonly accountGuid: string; readonly fixedFacility?: string; readonly entry?: VisualizationLibraryEntry; }

/** Owns one live creation/rename proposal; retry never allocates a second saved identity. */
@Injectable()
export class LibraryLifecycle {
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly commands = inject(SavedVisualizationCommands);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly visualizations = inject(VisualizationNavigationService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly editor = signal<LibraryEditor | undefined>(undefined);
  readonly saving = signal(false);
  readonly step = signal<VisualizationCreationStep>('scope');
  private readonly ownerChosen = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly confirmation = signal<'delete' | 'discard' | undefined>(undefined);
  readonly deleteCandidate = signal<VisualizationLibraryEntry | undefined>(undefined);
  readonly proposal = signal<VisualizationCommand | undefined>(undefined);
  readonly outcome = signal<VisualizationCommandOutcome['state'] | undefined>(undefined);
  readonly conflictCurrent = signal<Readonly<IdbSavedVisualization> | undefined>(undefined);
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    scope: new FormControl<'portfolio' | 'facility'>('portfolio', { nonNullable: true }),
    facilityGuid: new FormControl('', { nonNullable: true }),
    chart: new FormControl<VisualizationChartChoiceId | null>(null),
    families: new FormControl<readonly VisualizationSourceKind[]>([], { nonNullable: true })
  });
  private readonly draft = signal(this.form.getRawValue());
  readonly facilities = computed(() => this.workspace.facilities().filter(item => item.accountId === this.workspace.account()?.guid));
  readonly lockedProposal = computed(() => !!this.proposal());
  readonly draftChanged = computed(() => !!this.editor() && JSON.stringify(this.draft()) !== JSON.stringify(this.editor()!.initial));
  readonly needsProtection = computed(() => this.saving() || this.draftChanged() || !!this.proposal());
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly canRetry = computed(() => !!this.proposal() && this.outcome() !== 'conflict' && this.canAct());
  readonly canDiscard = computed(() => !this.saving() && this.outcome() !== 'refresh-required');
  readonly ownerValid = computed(() => this.draft().scope === 'portfolio' || this.facilities().some(item => item.guid === this.draft().facilityGuid));
  readonly canEditDraft = computed(() => this.canAct() && !!this.editor() && !this.lockedProposal()
    && this.editor()!.accountGuid === this.workspace.account()?.guid);
  readonly selectedChart = computed(() => VISUALIZATION_CHART_CHOICES.find(choice => choice.value === this.draft().chart));
  readonly selectedFamilies = computed(() => VISUALIZATION_FAMILIES.filter(family => this.draft().families.includes(family.value)));
  readonly familiesValid = computed(() => this.draft().families.length > 0
    && new Set(this.draft().families).size === this.draft().families.length
    && this.selectedFamilies().length === this.draft().families.length);
  readonly canContinueFamilies = computed(() => this.canEditDraft() && this.ownerValid() && !!this.selectedChart() && this.familiesValid());
  readonly canSubmit = computed(() => this.canEditDraft() && !!this.draft().name.trim() && this.ownerValid()
    && (!!this.editor()?.entry || this.step() === 'name' && !!this.selectedChart() && this.familiesValid()));
  readonly selections = computed(() => {
    const selections: CreationSelection[] = [];
    const editor = this.editor(), value = this.draft();
    const facility = this.facilities().find(item => item.guid === value.facilityGuid);
    if (!editor || editor.entry) return selections;
    if (this.ownerChosen()) {
      if (!editor.fixedFacility) selections.push({ step: 'scope', label: value.scope === 'portfolio' ? 'Portfolio' : 'Facility', icon: value.scope === 'portfolio' ? 'account' : 'facility', editable: !editor.fixedFacility });
      if (value.scope === 'facility' && value.facilityGuid) selections.push({ step: 'facility',
        label: facility ? facility.name || 'Unnamed facility' : 'Facility unavailable', icon: 'facility', editable: !editor.fixedFacility });
    }
    const chart = this.selectedChart();
    if (chart) selections.push({ step: 'chart', label: chart.label, icon: 'dataVisualization', editable: true });
    if (this.selectedFamilies().length) selections.push({ step: 'families', label: this.selectedFamilies().map(family => family.label).join(', '), icon: 'database', editable: true });
    return selections;
  });
  private running?: Promise<void>;
  private leaveResolve?: (value: boolean) => void;
  private leavePromise?: Promise<boolean>;
  private awaitingSaveForLeave = false;

  constructor() {
    const subscription = this.form.valueChanges.subscribe(() => this.draft.set(this.form.getRawValue()));
    const unsaved = inject(UnsavedChangesService);
    const unregister = unsaved.register(() => this.needsProtection(), () => this.discard(), () => this.saving());
    const unload = unsaved.protectBeforeUnload(this.needsProtection);
    const preflight = unsaved.registerNavigationPreflight(() => this.resolveLeave());
    this.destroy.onDestroy(() => { subscription.unsubscribe(); unregister(); unload(); preflight(); this.finishLeave(false); });
  }
  openCreate(): void {
    if (!this.canAct() || this.editor() || this.proposal()) return;
    if (this.workspace.account()?.isSingleFacilityCompany && !this.navigation.isSingleSiteWorkspace()) {
      this.error.set('Restore the sole facility or convert this account to a portfolio before creating a visualization.'); return;
    }
    const accountGuid = this.workspace.account()?.guid;
    if (!accountGuid) return;
    const fixedFacility = this.navigation.isSingleSiteWorkspace() ? this.facilities()[0]?.guid : this.navigation.inventoryFacilityGuid();
    const initial: VisualizationCreationDraft = { name: '', scope: fixedFacility ? 'facility' : 'portfolio', facilityGuid: fixedFacility ?? '', chart: null, families: [] };
    this.startEditor({ initial, fixedFacility, accountGuid });
  }
  rename(entry: VisualizationLibraryEntry): void {
    if (!this.canAct() || this.editor() || !entry.editable) return;
    this.startEditor({ accountGuid: entry.record.accountId, entry, initial: {
      name: entry.name, scope: entry.scope, facilityGuid: entry.facilityGuid ?? '', chart: null, families: entry.families
    } });
  }
  private startEditor(editor: LibraryEditor): void {
    this.error.set(undefined); this.outcome.set(undefined); this.conflictCurrent.set(undefined);
    this.form.reset(editor.initial, { emitEvent: false }); this.draft.set(this.form.getRawValue()); this.editor.set(editor);
    this.ownerChosen.set(!!editor.fixedFacility); this.step.set(editor.entry ? 'name' : editor.fixedFacility ? 'chart' : 'scope');
  }
  selectScope(scope: 'portfolio' | 'facility'): void {
    if (!this.canEditDraft() || this.editor()?.entry || this.editor()?.fixedFacility || scope === 'facility' && !this.facilities().length) return;
    this.form.controls.scope.setValue(scope); this.ownerChosen.set(true);
    this.step.set(scope === 'facility' ? 'facility' : 'chart');
  }
  selectFacility(guid: string): void {
    if (!this.canEditDraft() || this.editor()?.entry || this.editor()?.fixedFacility
      || this.form.controls.scope.value !== 'facility' || !this.facilities().some(facility => facility.guid === guid)) return;
    this.form.controls.facilityGuid.setValue(guid); this.step.set('chart');
  }
  selectChart(chart: VisualizationChartChoiceId): void {
    if (!this.canEditDraft() || this.editor()?.entry || !this.ownerValid() || !VISUALIZATION_CHART_CHOICES.some(choice => choice.value === chart)) return;
    this.form.controls.chart.setValue(chart); this.step.set('families');
  }
  toggleFamily(kind: VisualizationSourceKind): void {
    if (!this.canEditDraft() || this.editor()?.entry || !this.selectedChart() || !VISUALIZATION_FAMILIES.some(family => family.value === kind)) return;
    const selected = this.form.controls.families.value;
    this.form.controls.families.setValue(selected.includes(kind) ? selected.filter(value => value !== kind) : [...selected, kind]);
  }
  continueFamilies(): void { if (this.canContinueFamilies()) this.step.set('name'); }
  editSelection(step: VisualizationCreationStep): void {
    if (this.canEditDraft() && this.selections().some(selection => selection.step === step && selection.editable)) this.step.set(step);
  }
  async submit(): Promise<void> {
    const editor = this.editor();
    if (!editor || !this.canSubmit()) { this.form.markAllAsTouched(); return; }
    if (!editor.entry && this.workspace.account()?.isSingleFacilityCompany && !this.navigation.isSingleSiteWorkspace()) {
      this.error.set('The sole facility is unavailable. Resolve account setup before creating this visualization.'); return;
    }
    const value = this.form.getRawValue();
    if (editor.fixedFacility && (value.scope !== 'facility' || value.facilityGuid !== editor.fixedFacility)) return;
    if (this.navigation.isSingleSiteWorkspace() && !editor.entry && value.scope !== 'facility') return;
    const command: VisualizationCommand = editor.entry ? {
      kind: 'update', accountGuid: editor.accountGuid, guid: editor.entry.record.guid, expectedRevision: editor.entry.record.revision,
      definition: { ...editor.entry.definition!, name: value.name.trim() }
    } : this.commands.prepareCreate(createVisualizationSetupDefinition({ name: value.name.trim(), accountGuid: editor.accountGuid,
      scope: value.scope === 'facility' ? { kind: 'facility', facilityGuid: value.facilityGuid } : { kind: 'portfolio' },
      chart: createVisualizationChart(value.chart!), sourceKinds: value.families }));
    this.proposal.set(command);
    await this.execute();
  }
  async duplicate(entry: VisualizationLibraryEntry): Promise<void> {
    if (!this.canAct() || this.editor() || this.proposal() || !entry.editable) return;
    try { this.proposal.set(this.commands.prepareDuplicate(entry.record)); await this.execute(); }
    catch (error) { this.error.set(message(error)); }
  }
  async duplicateToScope(entry: VisualizationLibraryEntry): Promise<void> {
    if (!this.canAct() || this.needsProtection() || this.editor() || !entry.editable) return;
    this.visualizations.rememberReturn(entry.record.accountId, this.navigation.inventoryFacilityGuid());
    try { if (!await this.router.navigate(this.visualizations.workbenchRoute(entry.record.accountId, entry.record.guid), { queryParams: { action: 'copy-scope' } })) this.error.set('The visualization could not be opened.'); }
    catch { this.error.set('The visualization could not be opened. Please try again.'); }
  }
  requestDelete(entry: VisualizationLibraryEntry): void {
    if (!this.canAct() || this.editor() || this.proposal()) return;
    this.error.set(undefined); this.deleteCandidate.set(entry); this.confirmation.set('delete');
  }
  async confirmDelete(): Promise<void> {
    const entry = this.deleteCandidate();
    if (!entry || !this.canAct() || this.proposal()) return;
    this.proposal.set({ kind: 'delete', accountGuid: entry.record.accountId, guid: entry.record.guid, expectedRevision: entry.record.revision });
    await this.execute();
  }
  retry(): Promise<void> { return this.canRetry() ? this.execute() : Promise.resolve(); }
  async reloadSavedConflict(): Promise<void> {
    const proposal = this.proposal();
    if (!proposal || this.outcome() !== 'conflict' || !this.canAct()) return;
    this.saving.set(true);
    try {
      await this.commands.recover(proposal.accountGuid, proposal.kind === 'duplicate' ? proposal.sourceGuid : proposal.guid);
    } catch (error) { this.error.set(message(error)); return; }
    finally { this.saving.set(false); }
    // Explicit action: discard the rejected proposal only after reading authoritative saved state.
    this.discard();
  }
  private execute(): Promise<void> {
    if (this.running) return this.running;
    const proposal = this.proposal();
    if (!proposal || !this.canAct() || proposal.accountGuid !== this.workspace.account()?.guid) return Promise.resolve();
    this.saving.set(true); this.error.set(undefined);
    this.running = this.run(proposal).catch(error => { if (!this.destroy.destroyed) this.error.set(message(error)); })
      .finally(() => { this.running = undefined; if (!this.destroy.destroyed) this.saving.set(false); });
    return this.running;
  }
  private async run(proposal: VisualizationCommand): Promise<void> {
    if (this.outcome() === 'refresh-required') {
      const recovered = await this.commands.recover(proposal.accountGuid, proposal.guid);
      if (this.destroy.destroyed || this.workspace.account()?.guid !== proposal.accountGuid) return;
      if (proposal.kind !== 'delete' && !recovered) throw new Error('The committed visualization could not be found. Keep this proposal and retry recovery.');
      await this.complete(proposal); return;
    }
    const result = await this.commands.submit(proposal);
    if (this.destroy.destroyed || this.workspace.account()?.guid !== proposal.accountGuid) return;
    this.outcome.set(result.state);
    if (result.state === 'committed') { await this.complete(proposal); return; }
    if (result.state === 'conflict') {
      this.conflictCurrent.set(result.current);
      this.error.set('This visualization changed or was deleted. Review the saved version before continuing; your proposed changes are retained.');
    } else if (result.state === 'refresh-required') this.error.set('Your change was saved, but the workspace could not refresh. Retry refresh to recover the saved identity.');
    else this.error.set(message(result.error));
  }
  private async complete(proposal: VisualizationCommand): Promise<void> {
    const callerOwnsNavigation = this.awaitingSaveForLeave || !!this.leaveResolve;
    this.proposal.set(undefined); this.outcome.set(undefined); this.error.set(undefined); this.conflictCurrent.set(undefined);
    this.editor.set(undefined); this.deleteCandidate.set(undefined); this.confirmation.set(undefined); this.saving.set(false);
    this.finishLeave(true);
    if (!callerOwnsNavigation && (proposal.kind === 'create' || proposal.kind === 'duplicate')) {
      this.visualizations.rememberReturn(proposal.accountGuid, this.navigation.inventoryFacilityGuid());
      if (!await this.visualizations.open(proposal.accountGuid, proposal.guid)) this.error.set('Saved successfully. Open the visualization from Dashboard to continue.');
    }
  }
  useSavedConflict(): void { this.resolveRenameConflict('saved'); }
  keepLocalConflict(): void { this.resolveRenameConflict('local'); }
  private resolveRenameConflict(choice: 'saved' | 'local'): void {
    if (this.saving()) return;
    const current = this.conflictCurrent(), editor = this.editor();
    if (!current || !editor?.entry) return;
    const read = readSavedVisualization(current);
    if (!('definition' in read)) return;
    const localName = this.form.controls.name.value;
    this.proposal.set(undefined); this.outcome.set(undefined); this.conflictCurrent.set(undefined); this.error.set(undefined);
    this.startEditor({ ...editor, entry: { ...editor.entry, record: current, definition: read.definition, name: read.definition.name },
      initial: { ...editor.initial, name: read.definition.name } });
    if (choice === 'local') this.form.controls.name.setValue(localName);
  }
  requestClose(): void {
    if (this.saving()) return;
    if (this.needsProtection()) this.confirmation.set('discard'); else this.discard();
  }
  discard(): void {
    if (!this.canDiscard()) return;
    this.editor.set(undefined); this.proposal.set(undefined); this.outcome.set(undefined); this.error.set(undefined);
    this.conflictCurrent.set(undefined); this.deleteCandidate.set(undefined); this.confirmation.set(undefined); this.finishLeave(true);
  }
  cancelConfirmation(): void {
    if (this.saving()) return;
    this.confirmation.set(undefined);
    // A retained deletion proposal moves to the library's visible recovery alert.
    this.deleteCandidate.set(undefined);
    this.finishLeave(false);
  }
  async resolveLeave(): Promise<boolean> {
    if (!this.needsProtection()) return true;
    if (this.running) {
      this.awaitingSaveForLeave = true;
      try { await this.running; } finally { this.awaitingSaveForLeave = false; }
    }
    if (!this.needsProtection()) return true;
    if (this.leavePromise) return this.leavePromise;
    this.confirmation.set('discard');
    this.leavePromise = new Promise(resolve => { this.leaveResolve = resolve; });
    return this.leavePromise;
  }
  private finishLeave(allowed: boolean): void { const resolve = this.leaveResolve; this.leaveResolve = undefined; this.leavePromise = undefined; resolve?.(allowed); }
}
function message(error: unknown): string { return error instanceof Error ? error.message : 'The visualization could not be saved. Retry or discard your proposed changes.'; }

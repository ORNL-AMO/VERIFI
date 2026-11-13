import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { VisualizationCommand, VisualizationCommandOutcome } from '@data/account-workspace/visualization-commands.models';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { createVisualizationSetupDefinition, type UtilitySelectionMode, type VisualizationDefinition, type VisualizationFacilitySelection, type VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import { resolveVisualizationFacilities, sameVisualizationFacilitySelection } from '@domain/visualizations/visualization-facilities';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { orderFacilities } from '@app/v1/shared/facilities/facility-order';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { VisualizationNavigationService } from '../../visualization-navigation.service';
import { VisualizationLibraryEntry } from '../visualization-library.models';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { VISUALIZATION_CHART_CHOICES, VisualizationChartChoiceId, createVisualizationChart } from '../../visualization-charts';
import { VISUALIZATION_DATA_SOURCES } from '../../visualization-data-sources';
import { UTILITY_RECIPES, type VisualizationRecipe } from '../../creation/visualization-recipes';
import { meterResourceChoices, meterSelectionChoices, nativeObservationAvailable, prepareDecisionChange } from '../../decisions/decision-tree';
import type { DecisionChangeResult } from '../../decisions/decision-types';

export type VisualizationCreationStep = 'facilities' | 'chart' | 'sources' | 'selection-mode' | 'resources' | 'observation' | 'name';
export interface VisualizationCreationDraft {
  name: string; facilitySelection: VisualizationFacilitySelection;
  chart: VisualizationChartChoiceId | null; sourceKinds: readonly VisualizationSourceKind[];
  recipe: VisualizationRecipe; selectionMode: UtilitySelectionMode | null; resourceIds: readonly string[]; dataMode: 'calendarized' | 'billing-period';
}
interface CreationSelection { readonly step: VisualizationCreationStep; readonly label: string; readonly icon: IconName; readonly editable: boolean; }
interface LibraryEditor { readonly initial: VisualizationCreationDraft; readonly accountGuid: string; readonly entry?: VisualizationLibraryEntry; }

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
  readonly step = signal<VisualizationCreationStep>('facilities');
  private readonly ownerChosen = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly confirmation = signal<'delete' | 'discard' | 'decision' | undefined>(undefined);
  readonly decisionCleared = signal<readonly string[]>([]);
  private pendingDecision?: { readonly fingerprint: string; readonly editor: LibraryEditor; readonly workspaceRevision: number; readonly apply: () => void };
  readonly deleteCandidate = signal<VisualizationLibraryEntry | undefined>(undefined);
  readonly proposal = signal<VisualizationCommand | undefined>(undefined);
  readonly outcome = signal<VisualizationCommandOutcome['state'] | undefined>(undefined);
  readonly conflictCurrent = signal<Readonly<IdbSavedVisualization> | undefined>(undefined);
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    facilitySelection: new FormControl<VisualizationFacilitySelection>({ kind: 'all' }, { nonNullable: true }),
    chart: new FormControl<VisualizationChartChoiceId | null>(null),
    sourceKinds: new FormControl<readonly VisualizationSourceKind[]>([], { nonNullable: true }),
    recipe: new FormControl<VisualizationRecipe>('custom', { nonNullable: true }),
    selectionMode: new FormControl<UtilitySelectionMode | null>(null),
    resourceIds: new FormControl<readonly string[]>([], { nonNullable: true }),
    dataMode: new FormControl<'calendarized' | 'billing-period'>('calendarized', { nonNullable: true })
  });
  private readonly draft = signal(this.form.getRawValue());
  readonly facilities = computed(() => orderFacilities(
    this.workspace.facilities().filter(item => item.accountId === this.workspace.account()?.guid),
    this.workspace.account()?.portfolioFacilityOrder));
  readonly facilitySummary = computed(() => {
    const selection = this.draft().facilitySelection;
    return selection.kind === 'all' ? 'All Facilities' : selection.facilityGuids.length === 1
      ? this.facilities().find(item => item.guid === selection.facilityGuids[0])?.name || 'Unavailable facility' : `${selection.facilityGuids.length} facilities`;
  });
  readonly lockedProposal = computed(() => !!this.proposal());
  readonly draftChanged = computed(() => !!this.editor() && JSON.stringify(this.draft()) !== JSON.stringify(this.editor()!.initial));
  readonly needsProtection = computed(() => this.saving() || this.draftChanged() || !!this.proposal());
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly canRetry = computed(() => !!this.proposal() && this.outcome() !== 'conflict' && this.canAct());
  readonly canDiscard = computed(() => !this.saving() && this.outcome() !== 'refresh-required');
  readonly ownerValid = computed(() => { const context = resolveVisualizationFacilities({ accountGuid: this.workspace.account()?.guid ?? '', facilitySelection: this.draft().facilitySelection }, this.facilities()); return context.scope.facilityGuids.length > 0 && !context.missingFacilityGuids.length; });
  readonly canEditDraft = computed(() => this.canAct() && !!this.editor() && !this.lockedProposal()
    && this.editor()!.accountGuid === this.workspace.account()?.guid);
  readonly canContinueFacilities = computed(() => this.canEditDraft() && this.ownerValid());
  readonly selectedChart = computed(() => VISUALIZATION_CHART_CHOICES.find(choice => choice.value === this.draft().chart));
  readonly selectedDataSources = computed(() => VISUALIZATION_DATA_SOURCES.filter(sourceKind => this.draft().sourceKinds.includes(sourceKind.value)));
  readonly dataSourcesValid = computed(() => this.draft().sourceKinds.length > 0
    && new Set(this.draft().sourceKinds).size === this.draft().sourceKinds.length
    && this.selectedDataSources().length === this.draft().sourceKinds.length);
  readonly canContinueSources = computed(() => this.canEditDraft() && this.ownerValid() && !!this.selectedChart() && this.dataSourcesValid());
  readonly recipes = UTILITY_RECIPES;
  readonly selectionModes = meterSelectionChoices();
  readonly selectedMode = computed(() => this.selectionModes.find(choice => choice.value === this.draft().selectionMode));
  readonly hasMeters = computed(() => this.draft().sourceKinds.includes('utility'));
  readonly sourceMeasure = computed(() => this.draft().recipe === 'cost-trend' ? 'cost' as const : 'energy' as const);
  readonly resourceChoices = computed(() => {
    const snapshot = this.workspace.snapshot(), value = this.draft();
    return snapshot && value.selectionMode ? meterResourceChoices(snapshot, this.scope(value), value.selectionMode, this.sourceMeasure()) : [];
  });
  readonly resourceCards = computed(() => {
    const choices = this.resourceChoices();
    return [...choices, ...this.draft().resourceIds.filter(value => !choices.some(choice => choice.value === value))
      .map(value => ({ value, label: 'Unavailable selection', detail: 'Select to remove', icon: this.selectedMode()?.icon ?? 'meter', available: false }))];
  });
  readonly resourcePrompt = computed(() => `Choose one or more ${this.selectedMode()?.label.toLowerCase() ?? 'resources'}.`);
  readonly resourcesValid = computed(() => {
    const value = this.draft();
    if (!this.hasMeters()) return true;
    if (!this.selectedMode()) return false;
    return value.resourceIds.length > 0 && value.resourceIds.every(id => this.resourceChoices().some(choice => choice.value === id));
  });
  readonly draftDefinition = computed(() => this.buildDefinition());
  readonly nativeAvailable = computed(() => { const definition = this.draftDefinition(); const source = definition?.sources.find(source => source.kind === 'utility'); return !!definition && !!source && nativeObservationAvailable(definition, source.id, this.workspace.snapshot()!); });
  readonly canContinueResources = computed(() => this.canEditDraft() && this.ownerValid() && this.resourcesValid());
  readonly canContinueObservation = computed(() => this.canContinueResources() && (this.draft().dataMode === 'calendarized' || this.nativeAvailable()));
  readonly canSubmit = computed(() => this.canEditDraft() && !!this.draft().name.trim() && this.form.controls.name.valid
    && (!!this.editor()?.entry || this.ownerValid() && this.step() === 'name' && !!this.selectedChart() && this.dataSourcesValid() && this.canContinueObservation()));
  readonly selections = computed(() => {
    const selections: CreationSelection[] = [], editor = this.editor(), value = this.draft();
    if (!editor || editor.entry) return selections;
    if (this.ownerChosen()) selections.push({ step: 'facilities', label: this.facilitySummary(), icon: 'facility', editable: true });
    const chart = this.selectedChart();
    if (chart) selections.push({ step: 'chart', label: chart.label, icon: chart.icon, editable: true });
    if (this.selectedDataSources().length) selections.push({ step: 'sources', label: this.selectedDataSources().map(source => source.label).join(', '), icon: this.selectedDataSources().length === 1 ? this.selectedDataSources()[0].icon : 'database', editable: true });
    if (this.hasMeters() && this.selectedMode()) selections.push({ step: 'selection-mode', label: this.selectedMode()!.label, icon: this.selectedMode()!.icon, editable: true });
    if (this.hasMeters() && this.resourcesValid()) {
      const names = this.resourceCards().filter(choice => value.resourceIds.includes(choice.value)).map(choice => choice.label);
      selections.push({ step: 'resources', label: names.join(', '), icon: 'checklist', editable: true });
      if (this.step() === 'observation' || this.step() === 'name') selections.push({ step: 'observation', label: value.dataMode === 'calendarized' ? 'Calendarized months' : 'Native bills', icon: value.dataMode === 'calendarized' ? 'calendar' : 'invoice', editable: true });
    }
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
    const accountGuid = this.workspace.account()?.guid;
    if (!accountGuid) return;
    const fixedFacility = this.navigation.inventoryFacilityGuid();
    const initial: VisualizationCreationDraft = { name: '', facilitySelection: fixedFacility ? { kind: 'fixed', facilityGuids: [fixedFacility] } : { kind: 'all' }, chart: null, sourceKinds: [], recipe: 'custom', ...this.initialMeterChoices() };
    this.startEditor({ initial, accountGuid });
  }
  rename(entry: VisualizationLibraryEntry): void {
    if (!this.canAct() || this.editor() || !entry.editable) return;
    this.startEditor({ accountGuid: entry.record.accountId, entry, initial: {
      name: entry.name, facilitySelection: entry.definition?.facilitySelection ?? { kind: 'all' }, chart: null, sourceKinds: entry.sourceKinds, recipe: 'custom', ...this.initialMeterChoices()
    } });
  }
  private startEditor(editor: LibraryEditor): void {
    this.error.set(undefined); this.outcome.set(undefined); this.conflictCurrent.set(undefined);
    this.pendingDecision = undefined; this.decisionCleared.set([]);
    this.form.reset(editor.initial, { emitEvent: false }); this.draft.set(this.form.getRawValue()); this.editor.set(editor);
    const preselected = !editor.entry && editor.initial.facilitySelection.kind === 'fixed'
      && editor.initial.facilitySelection.facilityGuids.length === 1
      && this.facilities().some(item => editor.initial.facilitySelection.kind === 'fixed' && item.guid === editor.initial.facilitySelection.facilityGuids[0]);
    this.ownerChosen.set(preselected); this.step.set(editor.entry ? 'name' : preselected ? 'chart' : 'facilities');
  }
  private initialMeterChoices() {
    return { selectionMode: null as UtilitySelectionMode | null, resourceIds: [] as readonly string[], dataMode: 'calendarized' as const };
  }
  private scope(value: VisualizationCreationDraft) { return resolveVisualizationFacilities({ accountGuid: this.workspace.account()?.guid ?? '', facilitySelection: value.facilitySelection }, this.facilities()).scope; }
  private buildDefinition(): VisualizationDefinition | undefined {
    const editor = this.editor(), value = this.draft(), snapshot = this.workspace.snapshot();
    if (!editor || !snapshot || !value.chart || !value.sourceKinds.length || !this.ownerValid()) return undefined;
    let definition = createVisualizationSetupDefinition({ name: value.name.trim() || 'Visualization', accountGuid: editor.accountGuid,
      facilitySelection: value.facilitySelection, chart: createVisualizationChart(value.chart), sourceKinds: value.sourceKinds });
    const sourceId = definition.sources.find(source => source.kind === 'utility')?.id;
    if (!sourceId) return definition;
    const change = (action: Parameters<typeof prepareDecisionChange>[1]) => { const result = prepareDecisionChange(definition, action, { snapshot }); if (result.state !== 'unchanged') definition = result.definition; };
    if (this.sourceMeasure() === 'cost') change({ kind: 'measure', sourceId, measure: 'cost' });
    if (value.selectionMode && this.selectedMode()) {
      change({ kind: 'selection-mode', sourceId, mode: value.selectionMode });
      for (const resourceId of value.resourceIds) change({ kind: 'toggle-resource', sourceId, resourceId, selected: true });
      change({ kind: 'source-settings', sourceId, settings: { dataMode: value.dataMode } });
    }
    return definition;
  }
  private requestDecision(result: DecisionChangeResult, apply: () => void): void {
    if (result.state === 'confirm') {
      this.pendingDecision = { fingerprint: JSON.stringify(this.form.getRawValue()), editor: this.editor()!, workspaceRevision: this.workspace.revision(), apply };
      this.decisionCleared.set(result.cleared); this.confirmation.set('decision');
    } else apply();
  }
  confirmDecision(): void {
    const pending = this.pendingDecision;
    if (!pending || !this.canEditDraft()) return;
    if (pending.editor !== this.editor() || pending.workspaceRevision !== this.workspace.revision() || pending.fingerprint !== JSON.stringify(this.form.getRawValue())) { this.error.set('Choices changed during review. Select the decision again.'); this.cancelConfirmation(); return; }
    this.pendingDecision = undefined; this.confirmation.set(undefined); this.decisionCleared.set([]); pending.apply();
  }
  private resetBindings(): void {
    this.form.patchValue({ resourceIds: [], dataMode: 'calendarized' });
  }
  selectFacilities(selection: VisualizationFacilitySelection): void {
    if (!this.canEditDraft() || this.editor()?.entry || sameVisualizationFacilitySelection(selection, this.draft().facilitySelection)) return;
    const definition = this.draftDefinition();
    if (!definition) { this.form.controls.facilitySelection.setValue(selection); return; }
    const result = prepareDecisionChange(definition, { kind: 'facilities', selection }, { snapshot: this.workspace.snapshot()! });
    this.requestDecision(result, () => {
      this.form.controls.facilitySelection.setValue(selection);
      if (result.state === 'unchanged') return;
      const source = result.definition.sources.find(source => source.kind === 'utility');
      if (source?.kind !== 'utility') return;
      const rule = source.selection?.kind === 'rule' ? source.selection.filter : undefined;
      this.form.patchValue({
        resourceIds: source.selectionMode === 'source' ? [...rule?.utilitySources ?? []] : source.selection?.kind === 'fixed' ? [...source.selection.guids] : [],
        dataMode: source.dataMode
      });
    });
  }
  continueFacilities(): void { if (this.canContinueFacilities()) { this.ownerChosen.set(true); this.step.set('chart'); } }
  selectChart(chart: VisualizationChartChoiceId): void {
    if (!this.canEditDraft() || this.editor()?.entry || !this.ownerValid() || !VISUALIZATION_CHART_CHOICES.some(choice => choice.value === chart)) return;
    this.form.controls.chart.setValue(chart); this.step.set('sources');
  }
  selectRecipe(recipe: Exclude<VisualizationRecipe, 'custom'>): void {
    if (!this.canEditDraft() || this.editor()?.entry || !this.ownerValid()) return;
    this.form.patchValue({ recipe, chart: 'line', sourceKinds: this.form.controls.sourceKinds.value.includes('utility') ? this.form.controls.sourceKinds.value : [...this.form.controls.sourceKinds.value, 'utility'] });
    if (!this.form.controls.name.value.trim()) this.form.controls.name.setValue(UTILITY_RECIPES.find(item => item.id === recipe)!.label);
    this.step.set('selection-mode');
  }
  selectMeterMode(mode: UtilitySelectionMode): void {
    if (!this.canEditDraft() || !this.hasMeters() || !this.selectionModes.some(choice => choice.value === mode)) return;
    const definition = this.draftDefinition(), sourceId = definition?.sources.find(source => source.kind === 'utility')?.id;
    if (!definition || !sourceId) return;
    this.requestDecision(prepareDecisionChange(definition, { kind: 'selection-mode', sourceId, mode }, { snapshot: this.workspace.snapshot()! }), () => {
      if (mode !== this.form.controls.selectionMode.value) this.resetBindings();
      this.form.controls.selectionMode.setValue(mode); this.step.set('resources');
    });
  }
  toggleResource(id: string): void {
    if (!this.canEditDraft() || !this.resourceCards().some(choice => choice.value === id)) return;
    const selected = this.form.controls.resourceIds.value;
    this.form.controls.resourceIds.setValue(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]);
  }
  selectObservation(dataMode: 'calendarized' | 'billing-period'): void {
    if (!this.canEditDraft() || dataMode === 'billing-period' && !this.nativeAvailable()) return;
    this.form.controls.dataMode.setValue(dataMode); this.step.set('name');
  }
  toggleSource(kind: VisualizationSourceKind): void {
    if (!this.canEditDraft() || this.editor()?.entry || !this.selectedChart() || !VISUALIZATION_DATA_SOURCES.some(source => source.value === kind)) return;
    const selected = this.form.controls.sourceKinds.value;
    const apply = () => { this.form.controls.sourceKinds.setValue(selected.includes(kind) ? selected.filter(value => value !== kind) : [...selected, kind]); if (kind === 'utility' && selected.includes(kind)) { this.resetBindings(); this.form.controls.selectionMode.setValue(null); } };
    if (kind === 'utility' && selected.includes(kind) && this.resourcesValid()) this.requestDecision({ state: 'confirm', definition: this.draftDefinition()!, cleared: ['Meter resource selections'], affectedNodeIds: [] }, apply); else apply();
  }
  continueSources(): void { if (this.canContinueSources()) this.step.set(this.hasMeters() ? 'selection-mode' : 'name'); }
  continueResources(): void { if (this.canContinueResources()) this.step.set('observation'); }
  continueObservation(): void { if (this.canContinueObservation()) this.step.set('name'); }
  editSelection(step: VisualizationCreationStep): void {
    if (!this.canEditDraft() || !this.selections().some(selection => selection.step === step && selection.editable)) return;
    this.error.set(undefined); this.step.set(step);
  }
  async submit(): Promise<void> {
    const editor = this.editor();
    if (!editor || !this.canSubmit()) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    let command: VisualizationCommand;
    try { command = editor.entry ? {
      kind: 'update', accountGuid: editor.accountGuid, guid: editor.entry.record.guid, expectedRevision: editor.entry.record.revision,
      definition: { ...editor.entry.definition!, name: value.name.trim() }
    } : this.commands.prepareCreate({ ...this.draftDefinition()!, name: value.name.trim() }); }
    catch (error) { this.error.set(message(error)); return; }
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
      const opened = await this.visualizations.open(proposal.accountGuid, proposal.guid);
      if (!opened) this.error.set('Saved successfully. Open the visualization from Dashboard to continue.');
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
    this.pendingDecision = undefined; this.decisionCleared.set([]);
    this.editor.set(undefined); this.proposal.set(undefined); this.outcome.set(undefined); this.error.set(undefined);
    this.conflictCurrent.set(undefined); this.deleteCandidate.set(undefined); this.confirmation.set(undefined); this.finishLeave(true);
  }
  cancelConfirmation(): void {
    if (this.saving()) return;
    this.confirmation.set(undefined); this.pendingDecision = undefined; this.decisionCleared.set([]);
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

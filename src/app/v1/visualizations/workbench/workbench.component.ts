import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import type { VisualizationDefinition, VisualizationFacilitySelection } from '@domain/visualizations/visualization-definition';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { FormControl } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { VisualizationEditorSession } from '../editing/visualization-editor-session.service';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { visualizationChartLabel } from '../visualization-charts';
import { VISUALIZATION_DATA_SOURCES, visualizationDataSourceChoices } from '../visualization-data-sources';
import { PreviewRegistry } from '../preview/preview-registry';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';
import { RecoveryActionsComponent, VisualizationChildDraftGuard } from '../recovery/recovery-actions/recovery-actions.component';
import { createVisualizationDefinition, VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import { discoverUtilitySeries } from '@domain/visualizations/utility/utility-catalog';
import { visualizationIntentEqual } from '../editing/visualization-reconciliation';

@Component({ selector: 'app-visualization-workbench', standalone: false,
  templateUrl: './workbench.component.html', styleUrls: ['./workbench.component.css'], providers: [VisualizationEditorSession] })
export class WorkbenchComponent {
  readonly editor = inject(VisualizationEditorSession);
  readonly dataSources = visualizationDataSourceChoices();
  readonly sourceKindControl = new FormControl<VisualizationSourceKind>('utility', { nonNullable: true });
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly journeys = inject(VisualizationNavigationService);
  private readonly registry = inject(PreviewRegistry);
  private readonly unsaved = inject(UnsavedChangesService);
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private portal?: TemplatePortal;
  private facilityPortal?: TemplatePortal;
  readonly facilityError = signal('');
  readonly facilityChange = signal<{ readonly selection: VisualizationFacilitySelection; readonly definition: VisualizationDefinition; readonly cleared: readonly string[]; readonly key: string; readonly revision: number; readonly snapshot: unknown } | undefined>(undefined);
  readonly facilities = computed(() => this.workspace.facilities().filter(item => item.accountId === this.accountGuid()));
  readonly facilityContext = computed(() => { const definition = this.editor.definition(); return definition ? resolveVisualizationFacilities(definition, this.facilities()) : undefined; });
  readonly facilityChangeStale = computed(() => { const proposal = this.facilityChange(); return !!proposal && (proposal.key !== this.editor.key() || proposal.revision !== this.editor.localRevision() || proposal.snapshot !== this.workspace.snapshot()); });
  private leaveResolve?: (accepted: boolean) => void;
  private leaving?: Promise<boolean>;
  private leaveKey = '';
  private leaveRevision = 0;
  readonly leaveOpen = signal(false);
  private readonly invalidEditors = signal<Readonly<Record<string, boolean>>>({});
  private readonly editorReset = signal(0);
  readonly hasInvalidFields = computed(() => Object.values(this.invalidEditors()).some(Boolean));
  readonly editorKey = computed(() => `${this.editor.key()}:${this.editorReset()}`);
  readonly recoveryChildDrafts: VisualizationChildDraftGuard = { invalid: this.hasInvalidFields, key: this.editorKey, discard: () => this.discardFields() };
  @ViewChild('facilityDialog', { static: true }) private facilityDialog!: TemplateRef<unknown>;
  @ViewChild('leaveDialog', { static: true }) private leaveDialog!: TemplateRef<unknown>;
  @ViewChild(RecoveryActionsComponent) private recoveryActions?: RecoveryActionsComponent;
  readonly accountGuid = computed(() => this.navigation.routeState().accountGuid ?? '');
  readonly scopeLabel = computed(() => {
    const scope = this.facilityContext()?.scope;
    return scope?.kind === 'facility' ? this.facilities().find(item => item.guid === scope.facilityGuid)?.name ?? 'Unavailable facility' : 'Portfolio';
  });
  readonly sourceSummary = computed(() => this.editor.definition()?.sources.map(source => ({ id: source.id,
    dataSourceLabel: VISUALIZATION_DATA_SOURCES.find(option => option.value === source.kind)!.label,
    measure: source.measure, setupUnavailable: !this.registry.editor(source.kind) })) ?? []);
  readonly chartSummary = computed(() => visualizationChartLabel(this.editor.definition()?.chart));
  readonly previewIdentity = computed(() => ({ accountGuid: this.accountGuid(), workspaceRevision: this.workspace.revision(),
    definitionGuid: this.navigation.routeState().visualizationGuid ?? '', definitionRevision: this.editor.localRevision() }));
  readonly previewActive = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot();
    return !!definition && !!snapshot && this.workspace.isReady() && snapshot.account.guid === this.accountGuid()
      && this.editor.record()?.guid === this.navigation.routeState().visualizationGuid
      && !this.editor.isMissing() && this.editor.state() !== 'readonly' && !this.editor.record()?.preservation?.locked
      && !inspectVisualizationReferences(definition, snapshot, this.editor.record()?.preservation?.references).length;
  });
  readonly sourceEditors = computed(() => {
    const definition = this.editor.definition(), key = this.editor.key(), revision = this.editor.localRevision();
    if (!definition) return [];
    return definition.sources.flatMap(source => {
      const registered = this.registry.editor(source.kind);
      return registered ? [{ id: source.id, component: registered.component, inputs: { context: { definition, sourceId: source.id,
        editorKey: this.editorKey(), validityChanged: (invalid: boolean) => this.setEditorValidity(key, source.id, invalid),
        disabled: !this.editor.canEdit(), changed: (next: typeof definition) => {
          if (this.editor.key() === key && this.editor.localRevision() === revision) this.editor.applyDefinition(next);
        } } } }] : [];
    });
  });
  readonly periodContext = computed(() => this.editContext('periods'));
  readonly discoveredSeries = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot();
    return definition && snapshot ? definition.sources.flatMap(source => source.kind === 'utility' ? discoverUtilitySeries(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope, source) : []) : [];
  });
  readonly chartContext = computed(() => ({ ...this.editContext('chart'), resolvedSeries: this.discoveredSeries(), identity: this.editorKey() }));
  readonly periodSummary = computed(() => {
    const period = this.editor.definition()?.period;
    if (!period) return 'Unavailable';
    if (period.kind === 'all-history') return 'All saved history';
    if (period.kind === 'fixed') return `${period.start} – ${period.end} (${period.basis})`;
    if (period.kind === 'rolling') return `Rolling ${period.count} ${period.unit}(s), ${period.anchor} anchor (${period.basis})`;
    return period.kind === 'fiscal-year' ? `Fiscal year ${period.year}` : 'Latest saved fiscal year';
  });
  readonly saveLabel = computed(() => this.hasInvalidFields() ? 'Correct unsaved field input' : ({ saved: 'Saved', dirty: 'Changes pending', saving: 'Saving…', invalid: 'Correct invalid input',
    error: 'Save failed', conflict: 'Review conflicting changes', 'refresh-required': 'Saved; workspace refresh required',
    missing: 'Visualization unavailable', readonly: 'Read-only saved visualization' })[this.editor.state()]);

  constructor() {
    effect(() => {
      const route = this.navigation.routeState();
      if (route.section === 'visualization' && route.visualizationGuid && route.accountGuid) {
        untracked(() => this.editor.open(route.accountGuid!, route.visualizationGuid!));
      }
    });
    const unregister = this.unsaved.registerNavigationPreflight(() => this.resolveLeave());
    const unregisterFields = this.unsaved.register(() => this.hasInvalidFields(), () => this.discardFields(), () => this.editor.saving());
    const unloadFields = this.unsaved.protectBeforeUnload(this.hasInvalidFields);
    let priorKey = '';
    effect(() => { const key = this.editor.key(); if (key !== priorKey) { priorKey = key; untracked(() => { this.invalidEditors.set({}); this.sourceKindControl.setValue('utility', { emitEvent: false }); }); } });
    this.destroy.onDestroy(() => { unregister(); unregisterFields(); unloadFields(); this.finishLeave(false); this.cancelFacilities(); });
  }

  private editContext(id: string) {
    const definition = this.editor.definition()!, key = this.editor.key(), revision = this.editor.localRevision();
    return { definition, editorKey: this.editorKey(), disabled: !this.editor.canEdit(), validityChanged: (invalid: boolean) => this.setEditorValidity(key, id, invalid),
      changed: (next: typeof definition) => { if (this.editor.key() === key && this.editor.localRevision() === revision && !visualizationIntentEqual(next, this.editor.definition())) this.editor.applyDefinition(next); } };
  }
  private setEditorValidity(key: string, id: string, invalid: boolean): void {
    if (key !== this.editor.key() || !!this.invalidEditors()[id] === invalid) return;
    this.invalidEditors.update(state => ({ ...state, [id]: invalid }));
  }
  private discardFields(): void { this.invalidEditors.set({}); this.editorReset.update(value => value + 1); }
  addDataSource(): void {
    const definition = this.editor.definition(); if (!definition || !this.editor.canEdit()) return;
    const kind = this.sourceKindControl.value;
    if (!this.dataSources.some(option => option.value === kind)) return;
    let index = 1; while (definition.sources.some(source => source.id === `${kind}-${index}`)) index++;
    const source = { ...createVisualizationDefinition('', definition.accountGuid, definition.facilitySelection, kind).sources[0], id: `${kind}-${index}` };
    this.editor.applyDefinition({ ...definition, sources: [...definition.sources, source] });
  }
  removeSource(id: string): void {
    const definition = this.editor.definition(); if (!definition || !this.editor.canEdit() || definition.sources.length < 2) return;
    this.invalidEditors.update(state => Object.fromEntries(Object.entries(state).filter(([key]) => key !== id)));
    this.editor.applyDefinition({ ...definition, sources: definition.sources.filter(source => source.id !== id), series: definition.series.filter(series => series.sourceId !== id) });
  }

  async requestFacilities(selection: VisualizationFacilitySelection): Promise<void> {
    if (!this.editor.canRetarget() || this.editor.saving() || this.facilityChange() || this.hasInvalidFields()) return;
    this.facilityError.set('');
    const ownerKey = this.editor.key();
    if (!await this.editor.flush()) { this.facilityError.set('Save or resolve the current changes before reviewing facilities.'); return; }
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot();
    if (ownerKey !== this.editor.key() || !definition || !snapshot || !this.editor.canRetarget()) return;
    const review = prepareVisualizationFacilityChange(definition, selection, snapshot);
    if (!review.cleared.length) { await this.editor.retarget(selection, review.definition); return; }
    this.facilityChange.set({ selection, ...review, key: this.editor.key(), revision: this.editor.localRevision(), snapshot });
    this.facilityPortal = new TemplatePortal(this.facilityDialog, this.container);
    this.modal.show(this.facilityPortal, { blockWorkspace: true });
  }

  async confirmFacilities(): Promise<void> {
    const proposal = this.facilityChange();
    if (!proposal || this.facilityChangeStale() || this.editor.saving() || this.hasInvalidFields()) return;
    if (await this.editor.retarget(proposal.selection, proposal.definition)) this.cancelFacilities();
  }

  async retryFacilities(): Promise<void> {
    if (await this.editor.retry()) this.cancelFacilities();
  }

  cancelFacilities(): void {
    if (this.editor.saving() || this.editor.state() === 'refresh-required') return;
    if (this.facilityPortal && this.modal.activePortal() === this.facilityPortal) this.modal.hide();
    this.facilityPortal = undefined; this.facilityChange.set(undefined);
  }

  back(): void { void this.journeys.returnToDashboard(this.accountGuid()); }

  resolveLeave(): Promise<boolean> {
    if (this.leaving) return this.leaving;
    this.leaving = this.prepareLeave().finally(() => this.leaving = undefined);
    return this.leaving;
  }

  private async prepareLeave(): Promise<boolean> {
    if (this.facilityChange() || this.recoveryActions?.blocksNavigation()) return false;
    if (!this.editor.needsProtection() && !this.hasInvalidFields()) return true;
    const flushed = !this.hasInvalidFields() && await this.editor.flush();
    if (this.facilityChange() || this.recoveryActions?.blocksNavigation()) return false;
    if (flushed && !this.hasInvalidFields()) return true;
    if (!this.editor.needsProtection() && !this.hasInvalidFields()) return true;
    this.leaveKey = this.editor.key(); this.leaveRevision = this.editor.localRevision();
    this.leaveOpen.set(true);
    this.portal = new TemplatePortal(this.leaveDialog, this.container);
    this.modal.show(this.portal, { blockWorkspace: true });
    return new Promise<boolean>(resolve => this.leaveResolve = resolve);
  }

  discardLeave(): void {
    if (this.editor.saving() || this.editor.state() === 'refresh-required' || this.leaveKey !== this.editor.key()
      || this.leaveRevision !== this.editor.localRevision()) { this.finishLeave(false); return; }
    this.editor.discard(); this.discardFields(); this.finishLeave(!this.editor.needsProtection());
  }

  async retryLeave(): Promise<void> {
    if (!this.hasInvalidFields() && await this.editor.retry()) this.finishLeave(true);
    else { this.leaveKey = this.editor.key(); this.leaveRevision = this.editor.localRevision(); }
  }

  finishLeave(accepted = false): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined; this.leaveOpen.set(false);
    const resolve = this.leaveResolve; this.leaveResolve = undefined; resolve?.(accepted);
  }
}

export const visualizationLeaveGuard: CanDeactivateFn<WorkbenchComponent> = () => inject(UnsavedChangesService).resolveNavigationPreflight();

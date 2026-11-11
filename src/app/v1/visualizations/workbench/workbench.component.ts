import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { VisualizationEditorSession } from '../editing/visualization-editor-session.service';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { visualizationChartLabel } from '../visualization-charts';
import { VISUALIZATION_FAMILIES } from '../visualization-families';
import { PreviewRegistry } from '../preview/preview-registry';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';

@Component({ selector: 'app-visualization-workbench', standalone: false,
  templateUrl: './workbench.component.html', styleUrls: ['./workbench.component.css'], providers: [VisualizationEditorSession] })
export class WorkbenchComponent {
  readonly editor = inject(VisualizationEditorSession);
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly journeys = inject(VisualizationNavigationService);
  private readonly registry = inject(PreviewRegistry);
  private readonly unsaved = inject(UnsavedChangesService);
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private portal?: TemplatePortal;
  private leaveResolve?: (accepted: boolean) => void;
  private leaving?: Promise<boolean>;
  private leaveKey = '';
  private leaveRevision = 0;
  readonly leaveOpen = signal(false);
  @ViewChild('leaveDialog', { static: true }) private leaveDialog!: TemplateRef<unknown>;
  readonly accountGuid = computed(() => this.navigation.routeState().accountGuid ?? '');
  readonly scopeLabel = computed(() => {
    const record = this.editor.record();
    if (!record) return 'Saved visualization';
    return record.facilityId ? this.workspace.facilities().find(item => item.guid === record.facilityId)?.name ?? 'Unavailable facility'
      : 'Portfolio';
  });
  readonly sourceSummary = computed(() => this.editor.definition()?.sources.map(source => ({ id: source.id,
    familyLabel: VISUALIZATION_FAMILIES.find(family => family.value === source.kind)!.label, measure: source.measure })) ?? []);
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
        disabled: !this.editor.canEdit(), changed: (next: typeof definition) => {
          if (this.editor.key() === key && this.editor.localRevision() === revision) this.editor.applyDefinition(next);
        } } } }] : [];
    });
  });
  readonly periodSummary = computed(() => {
    const period = this.editor.definition()?.period;
    if (!period) return 'Unavailable';
    if (period.kind === 'all-history') return 'All saved history';
    if (period.kind === 'fixed') return `${period.start} – ${period.end} (${period.basis})`;
    if (period.kind === 'rolling') return `Rolling ${period.count} ${period.unit}(s), ${period.anchor} anchor (${period.basis})`;
    return period.kind === 'fiscal-year' ? `Fiscal year ${period.year}` : 'Latest saved fiscal year';
  });
  readonly saveLabel = computed(() => ({ saved: 'Saved', dirty: 'Changes pending', saving: 'Saving…', invalid: 'Correct invalid input',
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
    this.destroy.onDestroy(() => { unregister(); this.finishLeave(false); });
  }

  back(): void { void this.journeys.returnToLibrary(this.accountGuid()); }

  resolveLeave(): Promise<boolean> {
    if (this.leaving) return this.leaving;
    this.leaving = this.prepareLeave().finally(() => this.leaving = undefined);
    return this.leaving;
  }

  private async prepareLeave(): Promise<boolean> {
    if (!this.editor.needsProtection()) return true;
    if (await this.editor.flush()) return true;
    if (!this.editor.needsProtection()) return true;
    this.leaveKey = this.editor.key(); this.leaveRevision = this.editor.localRevision();
    this.leaveOpen.set(true);
    this.portal = new TemplatePortal(this.leaveDialog, this.container);
    this.modal.show(this.portal, { blockWorkspace: true });
    return new Promise<boolean>(resolve => this.leaveResolve = resolve);
  }

  discardLeave(): void {
    if (this.editor.saving() || this.editor.state() === 'refresh-required' || this.leaveKey !== this.editor.key()
      || this.leaveRevision !== this.editor.localRevision()) { this.finishLeave(false); return; }
    this.editor.discard(); this.finishLeave(!this.editor.needsProtection());
  }

  async retryLeave(): Promise<void> {
    if (await this.editor.retry()) this.finishLeave(true);
    else { this.leaveKey = this.editor.key(); this.leaveRevision = this.editor.localRevision(); }
  }

  finishLeave(accepted = false): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined; this.leaveOpen.set(false);
    const resolve = this.leaveResolve; this.leaveResolve = undefined; resolve?.(accepted);
  }
}

export const visualizationLeaveGuard: CanDeactivateFn<WorkbenchComponent> = () => inject(UnsavedChangesService).resolveNavigationPreflight();

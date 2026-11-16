import { isAllPredictors, resolvePredictorSelection } from '@domain/visualizations/predictor/predictor-source';
import { Component, Input, computed, effect, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { decisionNodeId } from '../../decisions/decision-tree';
import { predictorResourceChoices, projectPredictorItems } from '../predictor-items';
import type { VisualizationSourceEditorContext } from '../../shared/source-editor-context';
import type { ResourceOption } from '../../shared/resource-picker/resource-picker.component';

@Component({ selector: 'app-predictor-source-editor', standalone: false,
  templateUrl: './predictor-source-editor.component.html', styleUrls: ['./predictor-source-editor.component.css'] })
export class PredictorSourceEditorComponent {
  readonly emptyNodes: ReadonlySet<string> = new Set();
  readonly contextState = signal<VisualizationSourceEditorContext | undefined>(undefined);
  readonly selected = new FormControl<string[]>([], { nonNullable: true });
  private readonly workspace = inject(AccountWorkspaceStore);

  @Input({ required: true }) set context(context: VisualizationSourceEditorContext) {
    this.contextState.set(context);
    context.disabled ? this.selected.disable({ emitEvent: false }) : this.selected.enable({ emitEvent: false });
  }

  readonly allMode = computed(() => {
    const context = this.contextState(), source = context?.definition.sources.find(source => source.id === context.sourceId);
    return source?.kind === 'predictor' && isAllPredictors(source);
  });
  constructor() {
    effect(() => {
      const context = this.contextState(), snapshot = this.workspace.snapshot();
      const source = context?.definition.sources.find(source => source.id === context.sourceId);
      const scope = context && snapshot ? resolveVisualizationFacilities(context.definition, snapshot.facilities).scope : undefined;
      this.selected.setValue(source?.kind === 'predictor' && snapshot && scope ? [...resolvePredictorSelection(snapshot, scope, source)] : []);
    });
  }
  selectAll(all: boolean): void {
    const context = this.contextState();
    if (context && !context.disabled) context.request?.({ kind: 'predictor-selection', sourceId: context.sourceId, predictorGuids: [], ...(all ? { all: true } : {}) });
  }
  readonly items = computed(() => {
    const snapshot = this.workspace.snapshot(), context = this.contextState();
    return snapshot && context ? projectPredictorItems(context.definition, context.sourceId, snapshot).map(item => ({ ...item,
      resetKey: context.nodeResetKeys?.[decisionNodeId({ kind: 'item', sourceId: context.sourceId, itemKey: item.key })] ?? 0 })) : [];
  });
  readonly choices = computed<readonly ResourceOption[]>(() => {
    const snapshot = this.workspace.snapshot(), context = this.contextState();
    if (!snapshot || !context) return [];
    const available = predictorResourceChoices(snapshot, resolveVisualizationFacilities(context.definition, snapshot.facilities).scope)
      .map(choice => ({ guid: choice.value, label: choice.label, icon: choice.icon, detail: choice.cardDetail }));
    return [...available, ...this.items().filter(item => !item.available).map(item => ({ guid: item.identity.resourceGuid!, label: item.label,
      detail: item.detail, unavailable: true }))];
  });

  toggleSelection(change: { readonly guid: string; readonly selected: boolean }): void {
    const selected = this.selected.value;
    this.setSelection(change.selected ? [...selected, change.guid] : selected.filter(guid => guid !== change.guid));
  }
  setSelection(predictorGuids: readonly string[]): void {
    const context = this.contextState();
    if (context && !context.disabled) context.request?.({ kind: 'predictor-selection', sourceId: context.sourceId, predictorGuids });
  }
}

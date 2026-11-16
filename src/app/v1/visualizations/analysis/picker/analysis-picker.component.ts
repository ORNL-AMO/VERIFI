import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { VisualizationScope } from '@domain/visualizations/visualization-definition';
import { AnalysisInventoryWorkspaceService } from '@app/v1/analysis/inventory/analysis-inventory-workspace.service';
import { reportAnalysisSelectionCard } from '@app/v1/reports/shared/analysis-selection/report-analysis-selection.models';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { analysisChoices } from '../analysis-items';

/** Shared metadata selection; the host owns the accepted binding and its review. */
@Component({ selector: 'app-visualization-analysis-picker', standalone: false,
  templateUrl: './analysis-picker.component.html', styleUrls: ['./analysis-picker.component.css'] })
export class AnalysisPickerComponent {
  readonly accountGuid = input.required<string>();
  readonly scope = input.required<VisualizationScope>();
  readonly allFacilities = input.required<boolean>();
  readonly selectedGuid = input<string | null>(null);
  readonly disabled = input(false);
  readonly resetKey = input.required<string>();
  readonly idPrefix = input.required<string>();
  readonly selected = output<string>();
  readonly selectionControl = new FormControl<string | null>(null);
  readonly inspectedGuid = signal<string | undefined>(undefined);
  readonly inventories = inject(AnalysisInventoryWorkspaceService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly destroy = inject(DestroyRef);
  readonly entries = computed(() => {
    const snapshot = this.workspace.snapshot();
    if (!snapshot || snapshot.account.guid !== this.accountGuid()) return [];
    const available = new Set(analysisChoices(snapshot, this.scope(), this.allFacilities()).map(choice => choice.value));
    return this.inventories.entries().filter(entry => available.has(entry.card.analysis.guid));
  });
  readonly cards = computed(() => {
    const showOwner = this.entries().some(entry => entry.scope === 'account') || this.scope().facilityGuids.length > 1;
    return this.entries().map(entry => ({
      ...reportAnalysisSelectionCard(entry.card.analysis.guid, entry.card.analysis, entry.card.status, this.inventories.statusState()),
      ...(showOwner ? { ownerName: entry.scope === 'account' ? 'Account analysis' : `Facility · ${entry.ownerName}` } : {})
    }));
  });
  readonly showTypeFilter = computed(() => new Set(this.cards().map(card => card.categoryValue)).size > 1);
  readonly inspected = computed(() => this.entries().find(entry => entry.card.analysis.guid === this.inspectedGuid()));
  readonly inspectedOutcome = computed(() => analysisOutcomeDisplay({ state: 'blocked', message: 'Results not requested' }, this.inspected()?.card.category ?? 'energy'));

  constructor() {
    effect(() => {
      this.selectionControl.setValue(this.selectedGuid(), { emitEvent: false });
      this.disabled() ? this.selectionControl.disable({ emitEvent: false }) : this.selectionControl.enable({ emitEvent: false });
    });
    effect(() => { this.resetKey(); this.inspectedGuid.set(undefined); });
    this.selectionControl.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(guid => {
      this.selectionControl.setValue(this.selectedGuid(), { emitEvent: false });
      if (guid) this.requestSelection(guid);
      // Radio accessors finish unchecking their siblings after valueChanges returns.
      queueMicrotask(() => {
        if (!this.destroy.destroyed) this.selectionControl.setValue(this.selectedGuid(), { emitEvent: false });
      });
    });
  }

  selectInspected(): void {
    const entry = this.inspected();
    if (entry) this.requestSelection(entry.card.analysis.guid);
    this.inspectedGuid.set(undefined);
  }

  private requestSelection(guid: string): void {
    if (!this.disabled() && guid !== this.selectedGuid() && this.entries().some(entry => entry.card.analysis.guid === guid)) {
      this.selected.emit(guid);
    }
  }
}

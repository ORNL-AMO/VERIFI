import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import type { VisualizationDisplaySettings } from '@domain/visualizations/visualization-definition';
import { visualizationSourceQuantity, visualizationSourceQuantities } from '@domain/visualizations/visualization-display-settings';
import type { VisualizationSourceEditorContext } from '../source-editor-context';

export type DisplaySettingsContext = Pick<VisualizationSourceEditorContext, 'definition' | 'disabled' | 'editorKey' | 'request'>;

@Component({ selector: 'app-visualization-display-settings', standalone: false, templateUrl: './display-settings.component.html', styleUrls: ['./display-settings.component.css'] })
export class DisplaySettingsComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly destroy = inject(DestroyRef);
  readonly contextState = signal<DisplaySettingsContext | undefined>(undefined);
  readonly units = new FormRecord<FormControl<string>>({});
  readonly treatment = new FormControl<'' | 'site' | 'source'>('', { nonNullable: true });
  readonly quantities = computed(() => {
    const context = this.contextState(), snapshot = this.workspace.snapshot();
    if (!context || !snapshot) return [];
    const converter = new ConvertValue(undefined, '', '');
    return [...new Set(context.definition.sources.flatMap(source => visualizationSourceQuantities(context.definition, source, snapshot)))].map(quantity => {
      const definition = converter._measures[quantity] as Record<string, Record<string, { name?: { singular?: string } }>> | undefined;
      const symbols = new Map<string, string>();
      for (const system of Object.values(definition ?? {})) for (const [symbol, value] of Object.entries(system)) if (converter.getUnit(symbol)?.measure === quantity) symbols.set(symbol, value.name?.singular ?? symbol);
      return { id: quantity, label: quantity === 'energy' ? 'Energy units' : quantity === 'volume' ? 'Volume / water units' : `${quantity} units`,
        options: [...symbols].map(([value, label]) => ({ value, label: `${label} (${value})` })) };
    });
  });
  readonly showTreatment = computed(() => {
    const context = this.contextState(), snapshot = this.workspace.snapshot();
    return !!context && !!snapshot && context.definition.sources.some(source => source.kind === 'utility' && source.measure === 'energy'
      || source.kind === 'analysis' && visualizationSourceQuantity(context.definition, source, snapshot) === 'energy');
  });

  @Input({ required: true }) set context(context: DisplaySettingsContext) {
    this.contextState.set(context);
    for (const quantity of this.quantities()) {
      if (!Object.hasOwn(this.units.controls, quantity.id)) {
        const control = new FormControl('', { nonNullable: true }); this.units.addControl(quantity.id, control, { emitEvent: false });
        control.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.publish());
      }
      const binding = context.definition.displaySettings?.units?.[quantity.id];
      this.units.controls[quantity.id].setValue(binding?.kind === 'pinned' ? binding.value : '', { emitEvent: false });
    }
    const treatment = context.definition.displaySettings?.energyTreatment;
    this.treatment.setValue(treatment?.kind === 'pinned' ? treatment.value : '', { emitEvent: false });
    if (context.disabled) { this.units.disable({ emitEvent: false }); this.treatment.disable({ emitEvent: false }); }
    else { this.units.enable({ emitEvent: false }); this.treatment.enable({ emitEvent: false }); }
  }
  constructor() { this.treatment.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.publish()); }
  private publish(): void {
    const context = this.contextState(); if (!context || context.disabled) return;
    const units = { ...context.definition.displaySettings?.units };
    for (const quantity of this.quantities()) {
      const value = this.units.controls[quantity.id]?.value ?? '';
      units[quantity.id] = value ? { kind: 'pinned', value } : { kind: 'owner' };
    }
    const treatment = this.treatment.value;
    const settings: VisualizationDisplaySettings = { units, ...(this.showTreatment() ? { energyTreatment: treatment ? { kind: 'pinned', value: treatment } : { kind: 'owner' } } : {}) };
    context.request?.({ kind: 'chart-display', settings });
  }
}

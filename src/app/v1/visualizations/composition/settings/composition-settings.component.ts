import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VisualizationChart, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { compositionPresets, isCompositionChart, type CompositionPreset } from '@domain/visualizations/visualization-composition';

@Component({ selector: 'app-composition-settings', standalone: false,
  templateUrl: './composition-settings.component.html', styleUrls: ['./composition-settings.component.css'] })
export class CompositionSettingsComponent implements OnChanges {
  @Input({ required: true }) definition!: VisualizationDefinition;
  @Input() disabled = false;
  @Input() singleFacility = false;
  @Output() requested = new EventEmitter<VisualizationChart>();
  readonly kind = signal('');
  readonly presets = signal<readonly CompositionPreset[]>([]);
  readonly retainedHierarchy = signal('');
  readonly form = new FormGroup({
    type: new FormControl<'bar' | 'donut'>('bar', { nonNullable: true }),
    values: new FormControl<'absolute' | 'percent'>('absolute', { nonNullable: true }),
    hierarchy: new FormControl('', { nonNullable: true }),
    flow: new FormControl<'source-to-equipment' | 'source-to-group' | 'energy-balance'>('source-to-equipment', { nonNullable: true })
  });
  constructor() {
    const destroy = inject(DestroyRef);
    this.form.valueChanges.pipe(takeUntilDestroyed(destroy)).subscribe(() => {
      const chart = this.definition.chart; if (this.disabled || !isCompositionChart(chart)) return;
      const value = this.form.getRawValue();
      const next: VisualizationChart = chart.kind === 'breakdown' ? { ...chart, type: value.type, values: value.values }
        : chart.kind === 'sankey' ? { ...chart, flow: value.flow }
        : { ...chart, values: value.values, hierarchy: this.presets().find(preset => preset.levels.join('/') === value.hierarchy)?.levels ?? chart.hierarchy };
      if (JSON.stringify(chart) !== JSON.stringify(next)) this.requested.emit(next);
    });
  }
  ngOnChanges(): void {
    const chart = this.definition.chart; if (!isCompositionChart(chart)) return;
    this.kind.set(chart.kind);
    const source = this.definition.sources[0], single = this.singleFacility || this.definition.facilitySelection.kind === 'fixed' && this.definition.facilitySelection.facilityGuids.length === 1;
    this.presets.set(compositionPresets(source?.kind === 'utility' ? 'utility' : 'energy-use', single));
    const hierarchy = chart.kind === 'treemap' || chart.kind === 'sunburst' ? chart.hierarchy.join('/') : '';
    this.retainedHierarchy.set(hierarchy && !this.presets().some(preset => preset.levels.join('/') === hierarchy) ? hierarchy : '');
    this.form.patchValue({ type: chart.kind === 'breakdown' ? chart.type : 'bar', values: 'values' in chart ? chart.values : 'absolute',
      hierarchy: chart.kind === 'treemap' || chart.kind === 'sunburst' ? chart.hierarchy.join('/') : '', flow: chart.kind === 'sankey' ? chart.flow : 'source-to-equipment' }, { emitEvent: false });
    this.disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
  }
}

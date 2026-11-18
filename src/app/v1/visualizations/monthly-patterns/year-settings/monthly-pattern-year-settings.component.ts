import { Component, DestroyRef, Input, OnChanges, inject, output } from '@angular/core';
import { FormControl, FormGroup, FormRecord } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VisualizationChart, MonthlyPatternYearStyle } from '@domain/visualizations/visualization-definition';
import type { MonthlyPatternYear } from '../monthly-patterns.presenter';

type YearForm = FormGroup<{ label: FormControl<string>; color: FormControl<string>; lineStyle: FormControl<'solid' | 'dashed' | 'dotted'>; visible: FormControl<boolean> }>;
@Component({ selector: 'app-monthly-pattern-year-settings', standalone: false, templateUrl: './monthly-pattern-year-settings.component.html', styleUrl: './monthly-pattern-year-settings.component.css' })
export class MonthlyPatternYearSettingsComponent implements OnChanges {
  @Input({ required: true }) chart!: VisualizationChart;
  @Input() years: readonly MonthlyPatternYear[] = [];
  @Input() disabled = false;
  @Input() editorKey = '';
  readonly changed = output<VisualizationChart>();
  readonly form = new FormRecord<YearForm>({});
  rows: readonly { key: string; label: string; form: YearForm; absent: boolean }[] = [];
  private key = '';
  private hydrated = new Map<string, string>();
  ngOnChanges(): void {
    if (this.chart.kind !== 'monthly-patterns') return;
    if (this.key !== this.editorKey) { for (const key of Object.keys(this.form.controls)) this.form.removeControl(key, { emitEvent: false }); this.key = this.editorKey; }
    const keys = [...new Set([...this.years.map(year => String(year.year)), ...Object.keys(this.chart.yearOverrides ?? {})])].sort((a, b) => Number(a) - Number(b));
    this.rows = keys.map(key => {
      const year = this.years.find(year => String(year.year) === key), style = this.chart.kind === 'monthly-patterns' ? this.chart.yearOverrides?.[key] : undefined;
      let form = this.form.controls[key];
      if (!form) {
        form = new FormGroup({ label: new FormControl('', { nonNullable: true }), color: new FormControl('', { nonNullable: true }),
          lineStyle: new FormControl<'solid' | 'dashed' | 'dotted'>('solid', { nonNullable: true }), visible: new FormControl(true, { nonNullable: true }) });
        this.form.addControl(key, form, { emitEvent: false });
      }
      const label = style?.label ?? '', oldLabel = form.controls.label.value;
      form.patchValue({ label: oldLabel.trim() === label.trim() ? oldLabel : label, color: style?.color ?? year?.color ?? '', lineStyle: style?.lineStyle ?? 'solid', visible: style?.visible !== false }, { emitEvent: false });
      this.hydrated.set(key, JSON.stringify(form.getRawValue()));
      return { key, label: year?.label ?? key, form, absent: !year };
    });
    this.disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
  }
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      if (this.disabled || this.chart.kind !== 'monthly-patterns') return;
      const overrides: Record<string, MonthlyPatternYearStyle> = { ...this.chart.yearOverrides };
      for (const row of this.rows) {
        const value = row.form.getRawValue();
        if (this.hydrated.get(row.key) === JSON.stringify(value)) continue;
        overrides[row.key] = { ...(value.label.trim() ? { label: value.label.trim() } : {}), ...(value.color.trim() ? { color: value.color.trim() } : {}), lineStyle: value.lineStyle, visible: value.visible };
      }
      this.changed.emit({ ...this.chart, yearOverrides: overrides });
    });
  }
}

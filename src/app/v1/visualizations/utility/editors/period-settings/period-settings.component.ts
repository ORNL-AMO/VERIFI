import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VisualizationComparison, VisualizationDefinition, VisualizationPeriod } from '@domain/visualizations/visualization-definition';
import type { PeriodSettingsContext } from '../utility-editor-context';

export interface PeriodFormValue {
  kind: VisualizationPeriod['kind']; basis: 'calendar' | 'fiscal'; start: string; end: string;
  count: number | null; unit: 'month' | 'year'; anchor: 'latest-data' | 'calendar'; includeIncomplete: boolean; year: number | null;
  comparison: VisualizationComparison['kind']; comparisonBasis: 'calendar' | 'fiscal'; comparisonStart: string; comparisonEnd: string;
}

export function periodFormValue(definition: VisualizationDefinition): PeriodFormValue {
  const period = definition.period, comparison = definition.comparison;
  return { kind: period.kind, basis: 'basis' in period ? period.basis : 'calendar',
    start: period.kind === 'fixed' ? period.start : '', end: period.kind === 'fixed' ? period.end : '',
    count: period.kind === 'rolling' ? period.count : 12, unit: period.kind === 'rolling' ? period.unit : 'month',
    anchor: period.kind === 'rolling' ? period.anchor : 'latest-data',
    includeIncomplete: period.kind === 'rolling' ? period.includeIncomplete : true,
    year: period.kind === 'fiscal-year' ? period.year : null,
    comparison: comparison.kind, comparisonBasis: comparison.kind === 'previous-year' ? comparison.basis : 'calendar',
    comparisonStart: comparison.kind === 'custom' ? comparison.start : '', comparisonEnd: comparison.kind === 'custom' ? comparison.end : '' };
}

function validCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function periodFormIssue(value: PeriodFormValue): string | undefined {
  if (value.kind === 'fixed' && (!validCivilDate(value.start) || !validCivilDate(value.end) || value.start > value.end))
    return 'Choose real start and end dates in chronological order.';
  if (value.kind === 'rolling' && (!Number.isSafeInteger(value.count) || value.count! < 1)) return 'Enter a positive whole number of rolling periods.';
  if (value.kind === 'fiscal-year' && (!Number.isSafeInteger(value.year) || value.year! < 1 || value.year! > 9999)) return 'Enter a fiscal year from 1 to 9999.';
  if (value.comparison === 'custom' && (!validCivilDate(value.comparisonStart) || !validCivilDate(value.comparisonEnd) || value.comparisonStart > value.comparisonEnd))
    return 'Choose real comparison start and end dates in chronological order.';
  return undefined;
}

export function applyPeriodForm(definition: VisualizationDefinition, value: PeriodFormValue): VisualizationDefinition {
  if (periodFormIssue(value)) return definition;
  const period: VisualizationPeriod = value.kind === 'fixed' ? { kind: 'fixed', start: value.start, end: value.end, basis: value.basis }
    : value.kind === 'rolling' ? { kind: 'rolling', count: value.count!, unit: value.unit, anchor: value.anchor, basis: value.basis, includeIncomplete: value.includeIncomplete }
    : value.kind === 'fiscal-year' ? { kind: 'fiscal-year', year: value.year! }
    : value.kind === 'latest-saved-year' ? { kind: 'latest-saved-year', basis: 'fiscal' } : { kind: 'all-history' };
  const comparison: VisualizationComparison = value.comparison === 'custom' ? { kind: 'custom', start: value.comparisonStart, end: value.comparisonEnd }
    : value.comparison === 'previous-year' ? { kind: 'previous-year', basis: value.comparisonBasis }
    : { kind: value.comparison };
  return { ...definition, period, comparison };
}

function periodSettingsFingerprint(definition: VisualizationDefinition): string {
  return JSON.stringify([definition.facilitySelection, definition.period, definition.comparison]);
}

@Component({ selector: 'app-utility-period-settings', standalone: false, templateUrl: './period-settings.component.html',
  styleUrls: ['./period-settings.component.css'] })
export class PeriodSettingsComponent {
  private readonly destroy = inject(DestroyRef);
  private contextValue?: PeriodSettingsContext;
  private identity = '';
  private savedFingerprint = '';
  readonly conflict = signal(false);
  readonly disabled = signal(true);
  readonly form = new FormGroup({
    kind: new FormControl<VisualizationPeriod['kind']>('all-history', { nonNullable: true }),
    basis: new FormControl<'calendar' | 'fiscal'>('calendar', { nonNullable: true }),
    start: new FormControl('', { nonNullable: true }), end: new FormControl('', { nonNullable: true }),
    count: new FormControl<number | null>(12), unit: new FormControl<'month' | 'year'>('month', { nonNullable: true }),
    anchor: new FormControl<'latest-data' | 'calendar'>('latest-data', { nonNullable: true }),
    includeIncomplete: new FormControl(true, { nonNullable: true }), year: new FormControl<number | null>(null),
    comparison: new FormControl<VisualizationComparison['kind']>('none', { nonNullable: true }),
    comparisonBasis: new FormControl<'calendar' | 'fiscal'>('calendar', { nonNullable: true }),
    comparisonStart: new FormControl('', { nonNullable: true }), comparisonEnd: new FormControl('', { nonNullable: true })
  }, { validators: control => periodFormIssue(control.getRawValue() as PeriodFormValue) ? { periodSetup: true } : null });
  readonly value = signal(this.form.getRawValue());
  readonly issue = computed(() => periodFormIssue(this.value()));

  @Input({ required: true }) set context(context: PeriodSettingsContext) {
    this.contextValue = context; this.disabled.set(context.disabled);
    const identity = JSON.stringify([context.editorKey, context.resetKey, context.definition.accountGuid]);
    const fingerprint = periodSettingsFingerprint(context.definition);
    if (identity !== this.identity) {
      this.identity = identity; this.hydrate(context.definition);
    } else if (fingerprint !== this.savedFingerprint) {
      if (this.conflict() || periodFormIssue(this.form.getRawValue())) this.conflict.set(true);
      else this.hydrate(context.definition);
    }
    context.disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
    context.validityChanged?.(this.conflict() || !!periodFormIssue(this.form.getRawValue()));
  }

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.contextValue?.draftChanged?.();
      const value = this.form.getRawValue(); this.value.set(value);
      this.publish();
    });
    this.destroy.onDestroy(() => this.contextValue?.validityChanged?.(false));
  }

  selectChoice<T>(control: FormControl<T>, value: T): void {
    if (this.disabled() || control.disabled || control.value === value) return;
    control.markAsDirty();
    control.setValue(value);
  }

  useSaved(): void {
    const context = this.contextValue;
    if (!context || context.disabled) return;
    this.hydrate(context.definition); context.validityChanged?.(false);
  }

  keepLocal(): void {
    const context = this.contextValue;
    if (!context || context.disabled) return;
    this.savedFingerprint = periodSettingsFingerprint(context.definition);
    this.conflict.set(false); this.publish();
  }

  private hydrate(definition: VisualizationDefinition): void {
    this.savedFingerprint = periodSettingsFingerprint(definition); this.conflict.set(false);
    this.form.reset(periodFormValue(definition), { emitEvent: false }); this.value.set(this.form.getRawValue());
  }

  private publish(): void {
    const context = this.contextValue, value = this.form.getRawValue(), invalid = !!periodFormIssue(value);
    context?.validityChanged?.(this.conflict() || invalid);
    if (!context || context.disabled || invalid || this.conflict()) return;
    const next = applyPeriodForm(context.definition, value);
    this.savedFingerprint = periodSettingsFingerprint(next);
    context.changed({ period: next.period, comparison: next.comparison });
  }
}

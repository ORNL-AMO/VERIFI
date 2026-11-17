import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VisualizationComparison, VisualizationDefinition, VisualizationPeriod } from '@domain/visualizations/visualization-definition';
import type { PeriodSettingsContext } from '../source-editor-context';
import { applyPeriodForm, periodEditorPolicy, periodFormIssue, periodFormValue, type PeriodEditorNotice, type PeriodEditorPolicy, type PeriodFormValue } from './period-settings.models';

function periodSettingsFingerprint(definition: VisualizationDefinition): string {
  return JSON.stringify([definition.facilitySelection, definition.period, definition.comparison, definition.sources.some(source => source.kind === 'predictor'), definition.sources.some(source => source.kind === 'energy-use'), definition.sources.some(source => source.kind === 'analysis') ? definition.chart : undefined]);
}

@Component({ selector: 'app-visualization-period-settings', standalone: false, templateUrl: './period-settings.component.html',
  styleUrls: ['./period-settings.component.css'] })
export class PeriodSettingsComponent {
  private readonly destroy = inject(DestroyRef);
  private contextValue?: PeriodSettingsContext;
  private identity = '';
  private savedFingerprint = '';
  readonly conflict = signal(false);
  readonly disabled = signal(true);
  readonly policy = signal<PeriodEditorPolicy | undefined>(undefined);
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
  }, { validators: control => periodFormIssue(control.getRawValue() as PeriodFormValue, (this.policy()?.monthInput ?? false)) ? { periodSetup: true } : null });
  readonly value = signal(this.form.getRawValue());
  readonly issue = computed(() => periodFormIssue(this.value(), (this.policy()?.monthInput ?? false)));

  @Input({ required: true }) set context(context: PeriodSettingsContext) {
    const hadInvalidInput = !!periodFormIssue(this.form.getRawValue(), (this.policy()?.monthInput ?? false));
    this.contextValue = context; this.disabled.set(context.disabled);
    this.policy.set(periodEditorPolicy(context.definition));
    const identity = JSON.stringify([context.editorKey, context.resetKey, context.definition.accountGuid]);
    const fingerprint = periodSettingsFingerprint(context.definition);
    if (identity !== this.identity) {
      this.identity = identity; this.hydrate(context.definition);
    } else if (fingerprint !== this.savedFingerprint) {
      if (this.conflict() || hadInvalidInput) this.conflict.set(true);
      else this.hydrate(context.definition);
    }
    context.disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
    context.validityChanged?.(this.conflict() || !!periodFormIssue(this.form.getRawValue(), (this.policy()?.monthInput ?? false)));
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
    if ((control as unknown) === this.form.controls.kind) {
      this.form.patchValue({ ...this.policy()?.selectionDefaults, kind: value as VisualizationPeriod['kind'] });
    } else control.setValue(value);
  }

  useDefaults(kind: PeriodEditorNotice['kind']): void {
    if (this.disabled()) return;
    const notice = this.policy()?.notices.find(item => item.kind === kind);
    if (notice) this.form.patchValue(notice.reset);
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
    const context = this.contextValue, value = this.form.getRawValue(), invalid = !!periodFormIssue(value, (this.policy()?.monthInput ?? false));
    context?.validityChanged?.(this.conflict() || invalid);
    if (!context || context.disabled || invalid || this.conflict()) return;
    const next = applyPeriodForm(context.definition, value);
    this.savedFingerprint = periodSettingsFingerprint(next);
    context.changed({ period: next.period, comparison: next.comparison });
  }
}

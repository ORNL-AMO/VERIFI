import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, FormRecord, PristineChangeEvent, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { ConflictChoices, DraftConflict, draftEqual, reconcileFields, reconcileKeyedItems } from '@app/v1/data/editing/draft-reconciliation';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { WeatherMonth, weatherMonthValue } from '@platform/weather/hourly-weather-data.models';
import {
  WeatherStationMonthCalculationValue,
  WeatherStationMonthDraft,
  WeatherStationReadingColumn,
  WeatherStationReadingRow
} from '../../../models';

interface MonthValue { readonly predictorGuid: string; readonly amount: number | null; readonly override: boolean; }
interface MonthSnapshot { readonly month: string; readonly values: readonly MonthValue[]; }
type MonthAmountForm = FormGroup<{ amount: FormControl<number | null>; override: FormControl<boolean> }>;

@Component({
  selector: 'app-weather-reading-month-editor',
  templateUrl: './weather-reading-month-editor.component.html',
  styleUrls: ['./weather-reading-month-editor.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, EditorConflictReviewComponent, IconComponent, WorkspaceSlideoutComponent]
})
export class WeatherReadingMonthEditorComponent implements OnChanges {
  @Input({ required: true }) mode: 'add' | 'edit' = 'add';
  @Input({ required: true }) columns: readonly WeatherStationReadingColumn[] = [];
  @Input() contextKey = '';
  @Input() sessionKey = '';
  @Input() row?: WeatherStationReadingRow;
  @Input() unavailable = false;
  @Input() existingMonthKeys: readonly string[] = [];
  @Input() calculatedValues: readonly WeatherStationMonthCalculationValue[] = [];
  @Input() calculatedMonth?: string;
  @Input() calculating = false;
  @Input() calculationError?: string;
  @Input() saving = false;
  @Input() error?: string;
  @Output() readonly saved = new EventEmitter<WeatherStationMonthDraft>();
  @Output() readonly calculationRequested = new EventEmitter<WeatherMonth | undefined>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly form = new FormGroup({
    month: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    values: new FormRecord<MonthAmountForm>({})
  });
  private readonly formSnapshot = signal(this.form.getRawValue());
  private readonly formDirty = toSignal(this.form.events.pipe(
    filter((event): event is PristineChangeEvent => event instanceof PristineChangeEvent),
    map(event => !event.pristine), distinctUntilChanged()
  ), { initialValue: this.form.dirty });
  readonly month = computed(() => this.formSnapshot().month);
  readonly values = computed(() => Object.fromEntries(Object.entries(this.formSnapshot().values)
    .map(([guid, value]) => [guid, value.amount === null ? '' : String(value.amount)])));
  readonly overriddenPredictorGuids = computed<ReadonlySet<string>>(() => new Set(Object.entries(this.formSnapshot().values)
    .filter(([, value]) => value.override).map(([guid]) => guid)));
  readonly calculatedByPredictor = signal<ReadonlyMap<string, WeatherStationMonthCalculationValue>>(new Map());
  readonly dirty = computed(() => this.formDirty() || this.conflicts().length > 0);
  readonly conflicts = signal<readonly DraftConflict[]>([]);
  readonly displayColumns = signal<readonly WeatherStationReadingColumn[]>([]);
  readonly removedOutputs = computed(() => this.displayColumns().filter(column => !this.columns.some(current => current.predictor.guid === column.predictor.guid)));
  readonly validationError = signal<string | undefined>(undefined);
  readonly monthIsFuture = computed(() => {
    const selected = this.parseMonth(this.month());
    if (!selected) return false;
    const now = new Date();
    return weatherMonthValue(selected) > weatherMonthValue({ year: now.getFullYear(), month: now.getMonth() + 1 });
  });
  readonly gapPredictorNames = computed(() => this.displayColumns()
    .filter(column => this.calculatedByPredictor().get(column.predictor.guid)?.weatherDataWarning)
    .map(column => column.predictor.name));

  private identity: string | undefined;
  private baseline: MonthSnapshot | undefined;
  private conflictInput: { base: MonthSnapshot; local: MonthSnapshot; saved: MonthSnapshot } | undefined;
  private columnsByGuid = new Map<string, WeatherStationReadingColumn>();

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const before = this.formSnapshot();
      let next = this.form.getRawValue();
      if (draftEqual(before, next)) return;
      if (before.month !== next.month) this.form.controls.month.markAsDirty();
      for (const [guid, value] of Object.entries(next.values)) {
        const previous = before.values[guid];
        const controls = this.form.controls.values.controls[guid]?.controls;
        if (controls && previous) {
          if (value.amount !== previous.amount) controls.amount.markAsDirty();
          if (value.override !== previous.override) controls.override.markAsDirty();
        }
      }
      if (before.month !== next.month && this.mode === 'add') {
        for (const control of Object.values(this.form.controls.values.controls)) {
          control.patchValue({ amount: null, override: false }, { emitEvent: false });
        }
        this.calculatedByPredictor.set(new Map());
        next = this.form.getRawValue();
      }
      this.form.markAsDirty();
      this.formSnapshot.set(next);
      this.validationError.set(undefined);
      this.applyEnabledState();
      if (before.month !== next.month && this.mode === 'add') this.requestCalculation();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const identity = JSON.stringify([this.contextKey, this.sessionKey, this.mode]);
    for (const column of this.columns) this.columnsByGuid.set(column.predictor.guid, column);
    if (identity !== this.identity || !this.baseline) {
      this.identity = identity;
      this.baseline = undefined;
      this.columnsByGuid = new Map(this.columns.map(column => [column.predictor.guid, column]));
      this.baseline = this.savedSnapshot();
      this.conflictInput = undefined;
      this.conflicts.set([]);
      this.calculatedByPredictor.set(new Map());
      this.applySnapshot(this.baseline, true);
    } else if ((changes['row'] || changes['columns']) && !this.unavailable) {
      const saved = this.savedSnapshot();
      if (!monthSnapshotEqual(saved, this.baseline)) {
        const base = this.conflictInput?.base ?? this.baseline;
        const local = this.conflictInput?.local ?? this.editSnapshot();
        this.mergeSource(base, local, saved);
      }
    }
    this.updateMonthValidator();
    this.displayColumns.set(Object.keys(this.form.controls.values.controls).flatMap(guid => {
      const column = this.columnsByGuid.get(guid); return column ? [column] : [];
    }));
    if (changes['calculatedValues'] || changes['calculatedMonth']) this.applyCalculatedValues();
    this.applyEnabledState();
  }

  setMonth(value: string): void { if (!this.saving && this.mode === 'add') this.form.controls.month.setValue(value); }
  setValue(guid: string, value: string): void {
    const control = this.form.controls.values.controls[guid]?.controls.amount;
    if (!this.saving && !this.calculating && control?.enabled) control.setValue(value === '' ? null : Number(value));
  }

  toggleOverride(guid: string, event?: Event): void {
    if (this.saving || this.calculating || this.mode !== 'add' || this.conflicts().length) return;
    const group = this.form.controls.values.controls[guid];
    if (!group) return;
    const overridden = group.controls.override.value;
    group.patchValue({
      override: !overridden,
      amount: overridden ? this.calculatedByPredictor().get(guid)?.amount ?? null : group.controls.amount.value
    });
    if (!overridden) {
      const input = (event?.currentTarget as HTMLElement | null)?.parentElement?.querySelector<HTMLInputElement>('input');
      input?.focus();
    }
  }

  resolveConflicts(choices: ConflictChoices): void {
    const input = this.conflictInput;
    if (input) this.mergeSource(input.base, input.local, input.saved, choices);
    this.applyEnabledState();
  }

  useSavedOutputDeletions(): void {
    const removed = new Set(this.removedOutputs().map(column => column.predictor.guid));
    const snapshot = this.editSnapshot();
    const value = { ...snapshot, values: snapshot.values.filter(entry => !removed.has(entry.predictorGuid)) };
    this.applySnapshot(value, !!this.baseline && monthSnapshotEqual(value, this.baseline));
    this.applyCalculatedValues(); this.applyEnabledState();
  }

  refreshCalculation(): void { if (!this.saving && !this.calculating && this.mode === 'add') this.requestCalculation(); }

  save(): void {
    if (this.saving || this.calculating || this.unavailable || this.conflicts().length || this.removedOutputs().length) return;
    this.form.updateValueAndValidity({ emitEvent: false });
    const selected = this.parseMonth(this.month());
    if (!selected) { this.validationError.set('Choose a valid month.'); return; }
    const key = `${selected.year}-${String(selected.month).padStart(2, '0')}`;
    if (this.mode === 'add' && this.existingMonthKeys.includes(key)) {
      this.validationError.set('That month already exists. Edit the existing row instead.'); return;
    }
    const value = this.form.getRawValue();
    if (this.columns.some(column => !Number.isFinite(value.values[column.predictor.guid]?.amount)
      || value.values[column.predictor.guid]?.amount === null)) {
      this.form.markAllAsTouched(); this.validationError.set('Enter a value for every weather predictor.'); return;
    }
    this.saved.emit({ ...selected, values: this.columns.map(column => {
      const guid = column.predictor.guid;
      return { predictorGuid: guid, amount: value.values[guid].amount!,
        calculated: this.mode === 'add' && !value.values[guid].override,
        weatherDataWarning: this.calculatedByPredictor().get(guid)?.weatherDataWarning ?? false };
    }) });
  }

  @HostListener('document:keydown', ['$event'])
  saveFromKeyboard(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); this.save(); }
  }

  private savedSnapshot(): MonthSnapshot {
    const cells = new Map(this.row?.cells.map(cell => [cell.predictorGuid, cell]) ?? []);
    return {
      month: this.mode === 'edit' && this.row ? `${this.row.year}-${String(this.row.month).padStart(2, '0')}` : this.baseline?.month ?? '',
      values: this.columns.map(column => {
        const reading = cells.get(column.predictor.guid)?.reading;
        return { predictorGuid: column.predictor.guid,
          amount: this.mode === 'edit' && Number.isFinite(reading?.amount) ? reading!.amount : null,
          override: this.mode === 'edit' && !!reading?.weatherOverride };
      })
    };
  }

  private editSnapshot(): MonthSnapshot {
    const value = this.form.getRawValue();
    return { month: value.month, values: Object.entries(value.values).map(([predictorGuid, entry]) => ({
      predictorGuid, amount: this.mode === 'add' && !entry.override ? null : entry.amount, override: entry.override
    })) };
  }

  private mergeSource(base: MonthSnapshot, local: MonthSnapshot, saved: MonthSnapshot, choices: ConflictChoices = {}): void {
    const month = reconcileFields({ month: base.month }, { month: local.month }, { month: saved.month }, { choices });
    const values = reconcileKeyedItems(base.values, local.values, saved.values, value => value.predictorGuid,
      (before, draft, latest, prefix) => reconcileFields(before, draft, latest, { choices, prefix }), choices, 'values');
    this.baseline = saved;
    const merged = { month: month.value.month, values: values.value };
    const conflicts = [...month.conflicts, ...values.conflicts].map(conflict => {
      const guid = [...this.columnsByGuid.keys()].find(key => conflict.id === `values.${key}` || conflict.id.startsWith(`values.${key}.`));
      const name = guid ? this.columnsByGuid.get(guid)?.predictor.name : undefined;
      return name ? { ...conflict, label: `${name}: ${conflict.label === guid ? 'Reading values' : conflict.label}` } : conflict;
    });
    this.conflictInput = conflicts.length ? {
      base: { month: (month.baseline ?? { month: saved.month }).month, values: values.baseline ?? saved.values },
      local: merged, saved
    } : undefined;
    this.conflicts.set(conflicts);
    this.applySnapshot(merged, monthSnapshotEqual(merged, saved));
    this.applyCalculatedValues();
  }

  private applySnapshot(value: MonthSnapshot, pristine: boolean): void {
    const desired = new Set(value.values.map(entry => entry.predictorGuid));
    const controls = this.form.controls.values;
    for (const guid of Object.keys(controls.controls)) if (!desired.has(guid)) controls.removeControl(guid, { emitEvent: false });
    for (const entry of value.values) {
      if (!controls.controls[entry.predictorGuid]) controls.addControl(entry.predictorGuid, new FormGroup({
        amount: new FormControl<number | null>(null, [Validators.required, finiteAmount]),
        override: new FormControl(false, { nonNullable: true })
      }), { emitEvent: false });
      controls.controls[entry.predictorGuid].patchValue(entry, { emitEvent: false });
    }
    this.form.controls.month.setValue(value.month, { emitEvent: false });
    this.displayColumns.set(value.values.flatMap(entry => { const column = this.columnsByGuid.get(entry.predictorGuid); return column ? [column] : []; }));
    pristine ? this.form.markAsPristine() : this.form.markAsDirty();
    this.formSnapshot.set(this.form.getRawValue());
    this.validationError.set(undefined);
  }

  private applyCalculatedValues(): void {
    if (this.mode !== 'add' || (this.calculatedMonth && this.calculatedMonth !== this.month())) return;
    const calculated = new Map(this.calculatedValues.map(value => [value.predictorGuid, value]));
    this.calculatedByPredictor.set(calculated);
    for (const [guid, group] of Object.entries(this.form.controls.values.controls)) {
      if (!group.controls.override.value) group.controls.amount.setValue(calculated.get(guid)?.amount ?? null, { emitEvent: false });
    }
    this.formSnapshot.set(this.form.getRawValue());
  }

  private updateMonthValidator(): void {
    this.form.controls.month.setValidators([Validators.required, control => {
      const selected = this.parseMonth(control.value);
      if (!selected) return { invalidMonth: true };
      return this.mode === 'add' && this.existingMonthKeys.includes(control.value) ? { duplicateMonth: true } : null;
    }]);
    this.form.controls.month.updateValueAndValidity({ emitEvent: false });
  }

  private applyEnabledState(): void {
    const dirty = this.form.dirty;
    const blocked = this.saving || this.calculating || this.unavailable || this.conflicts().length > 0;
    for (const group of Object.values(this.form.controls.values.controls)) {
      blocked || (this.mode === 'add' && !group.controls.override.value)
        ? group.controls.amount.disable({ emitEvent: false }) : group.controls.amount.enable({ emitEvent: false });
    }
    blocked || this.mode === 'edit' ? this.form.controls.month.disable({ emitEvent: false }) : this.form.controls.month.enable({ emitEvent: false });
    if (dirty) this.form.markAsDirty();
  }

  private requestCalculation(): void {
    const selected = this.parseMonth(this.month());
    const duplicate = selected && this.existingMonthKeys.includes(`${selected.year}-${String(selected.month).padStart(2, '0')}`);
    if (duplicate) this.validationError.set('That month already exists. Edit the existing row instead.');
    this.calculationRequested.emit(selected && !duplicate && !this.monthIsFuture() ? selected : undefined);
  }

  private parseMonth(value: string): WeatherMonth | undefined {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return undefined;
    const year = Number(match[1]), month = Number(match[2]);
    return year > 0 && month >= 1 && month <= 12 ? { year, month } : undefined;
  }
}

function finiteAmount(control: AbstractControl<number | null>): ValidationErrors | null {
  return control.value === null || Number.isFinite(control.value) ? null : { finiteNumber: true };
}

function monthSnapshotEqual(first: MonthSnapshot, second: MonthSnapshot): boolean {
  const ordered = (value: MonthSnapshot) => ({ ...value, values: [...value.values].sort((a, b) => a.predictorGuid.localeCompare(b.predictorGuid)) });
  return draftEqual(ordered(first), ordered(second));
}

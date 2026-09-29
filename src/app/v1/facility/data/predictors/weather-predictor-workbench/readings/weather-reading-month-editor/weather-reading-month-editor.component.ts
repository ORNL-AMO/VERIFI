import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { WeatherMonth, weatherMonthValue } from '@platform/weather/hourly-weather-data.models';
import {
  WeatherStationMonthCalculationValue,
  WeatherStationMonthDraft,
  WeatherStationReadingColumn,
  WeatherStationReadingRow
} from '../../../models';

@Component({
  selector: 'app-weather-reading-month-editor',
  templateUrl: './weather-reading-month-editor.component.html',
  styleUrls: ['./weather-reading-month-editor.component.css'],
  standalone: true,
  imports: [IconComponent, WorkspaceSlideoutComponent]
})
export class WeatherReadingMonthEditorComponent implements OnChanges {
  @Input({ required: true }) mode: 'add' | 'edit' = 'add';
  @Input({ required: true }) columns: readonly WeatherStationReadingColumn[] = [];
  @Input() row?: WeatherStationReadingRow;
  @Input() existingMonthKeys: readonly string[] = [];
  @Input() calculatedValues: readonly WeatherStationMonthCalculationValue[] = [];
  @Input() calculating = false;
  @Input() calculationError?: string;
  @Input() saving = false;
  @Input() error?: string;
  @Output() readonly saved = new EventEmitter<WeatherStationMonthDraft>();
  @Output() readonly calculationRequested = new EventEmitter<WeatherMonth | undefined>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly month = signal('');
  readonly values = signal<Readonly<Record<string, string>>>({});
  readonly overriddenPredictorGuids = signal<ReadonlySet<string>>(new Set());
  readonly calculatedByPredictor = signal<ReadonlyMap<string, WeatherStationMonthCalculationValue>>(new Map());
  readonly dirty = signal(false);
  readonly validationError = signal<string | undefined>(undefined);
  readonly monthIsFuture = computed(() => {
    const selected = this.parseMonth(this.month());
    if (!selected) return false;
    const now = new Date();
    return weatherMonthValue(selected) > weatherMonthValue({
      year: now.getFullYear(),
      month: now.getMonth() + 1
    });
  });
  readonly gapPredictorNames = computed(() => this.columns
    .filter(column => this.calculatedByPredictor().get(column.predictor.guid)?.weatherDataWarning)
    .map(column => column.predictor.name));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['row'] || changes['columns'] || changes['mode']) this.initialize();
    if (changes['calculatedValues']) this.applyCalculatedValues();
  }

  setMonth(value: string): void {
    this.month.set(value);
    this.values.set(Object.fromEntries(this.columns.map(column => [column.predictor.guid, ''])));
    this.calculatedByPredictor.set(new Map());
    this.overriddenPredictorGuids.set(new Set());
    this.dirty.set(true);
    this.validationError.set(undefined);
    const selected = this.parseMonth(value);
    if (!selected) {
      this.calculationRequested.emit(undefined);
      return;
    }
    if (this.monthIsFuture()) {
      this.calculationRequested.emit(undefined);
      return;
    }
    const key = `${selected.year}-${String(selected.month).padStart(2, '0')}`;
    if (this.existingMonthKeys.includes(key)) {
      this.validationError.set('That month already exists. Edit the existing row instead.');
      this.calculationRequested.emit(undefined);
      return;
    }
    this.calculationRequested.emit(selected);
  }

  setValue(guid: string, value: string): void {
    this.values.update(values => ({ ...values, [guid]: value }));
    this.dirty.set(true);
    this.validationError.set(undefined);
  }

  toggleOverride(guid: string, event: Event): void {
    if (this.saving || this.calculating || this.mode !== 'add') return;
    const input = (event.currentTarget as HTMLElement | null)?.parentElement
      ?.querySelector<HTMLInputElement>('input');
    const overridden = this.overriddenPredictorGuids().has(guid);
    this.overriddenPredictorGuids.update(current => {
      const next = new Set(current);
      overridden ? next.delete(guid) : next.add(guid);
      return next;
    });
    if (overridden) {
      const calculated = this.calculatedByPredictor().get(guid);
      this.values.update(values => ({ ...values, [guid]: calculated ? String(calculated.amount) : '' }));
    } else {
      setTimeout(() => input?.focus());
    }
    this.dirty.set(true);
    this.validationError.set(undefined);
  }

  save(): void {
    if (this.saving || this.calculating) return;
    const selected = this.parseMonth(this.month());
    if (!selected) { this.validationError.set('Choose a valid month.'); return; }
    const { year, month } = selected;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (this.mode === 'add' && this.existingMonthKeys.includes(key)) {
      this.validationError.set('That month already exists. Edit the existing row instead.');
      return;
    }
    const values = this.columns.map(column => ({
      predictorGuid: column.predictor.guid,
      raw: this.values()[column.predictor.guid]?.trim() ?? '',
      amount: Number(this.values()[column.predictor.guid])
    }));
    if (values.some(value => value.raw === '' || !Number.isFinite(value.amount))) {
      this.validationError.set('Enter a value for every weather predictor.');
      return;
    }
    const calculated = this.calculatedByPredictor();
    const overridden = this.overriddenPredictorGuids();
    this.saved.emit({
      year,
      month,
      values: values.map(({ predictorGuid, amount }) => ({
        predictorGuid,
        amount,
        calculated: this.mode === 'add' && !overridden.has(predictorGuid),
        weatherDataWarning: calculated.get(predictorGuid)?.weatherDataWarning ?? false
      }))
    });
  }

  @HostListener('document:keydown', ['$event'])
  saveFromKeyboard(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.save();
    }
  }

  private initialize(): void {
    this.month.set(this.row ? `${this.row.year}-${String(this.row.month).padStart(2, '0')}` : '');
    this.values.set(Object.fromEntries(this.columns.map((column, index) => [
      column.predictor.guid,
      this.row?.cells[index]?.reading && Number.isFinite(this.row.cells[index].reading?.amount)
        ? String(this.row.cells[index].reading?.amount)
        : ''
    ])));
    this.dirty.set(false);
    this.calculatedByPredictor.set(new Map());
    this.overriddenPredictorGuids.set(new Set());
    this.validationError.set(undefined);
  }

  private applyCalculatedValues(): void {
    if (this.mode !== 'add') return;
    const calculated = new Map(this.calculatedValues.map(value => [value.predictorGuid, value]));
    this.calculatedByPredictor.set(calculated);
    this.values.update(values => Object.fromEntries(this.columns.map(column => {
      const guid = column.predictor.guid;
      const value = calculated.get(guid);
      return [guid, this.overriddenPredictorGuids().has(guid)
        ? values[guid] ?? ''
        : value ? String(value.amount) : ''];
    })));
  }

  private parseMonth(value: string): WeatherMonth | undefined {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return undefined;
    const year = Number(match[1]);
    const month = Number(match[2]);
    return Number.isInteger(year) && year > 0 && Number.isInteger(month) && month >= 1 && month <= 12
      ? { year, month }
      : undefined;
  }
}

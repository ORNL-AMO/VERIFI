import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { WeatherStationMonthDraft, WeatherStationReadingColumn, WeatherStationReadingRow } from '../../../models';

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
  @Input() saving = false;
  @Input() error?: string;
  @Output() readonly saved = new EventEmitter<WeatherStationMonthDraft>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly month = signal('');
  readonly values = signal<Readonly<Record<string, string>>>({});
  readonly dirty = signal(false);
  readonly validationError = signal<string | undefined>(undefined);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['row'] || changes['columns'] || changes['mode']) this.initialize();
  }

  setMonth(value: string): void { this.month.set(value); this.dirty.set(true); this.validationError.set(undefined); }
  setValue(guid: string, value: string): void {
    this.values.update(values => ({ ...values, [guid]: value }));
    this.dirty.set(true);
    this.validationError.set(undefined);
  }

  save(): void {
    if (this.saving) return;
    const match = /^(\d{4})-(\d{2})$/.exec(this.month());
    if (!match) { this.validationError.set('Choose a valid month.'); return; }
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      this.validationError.set('Choose a valid month.');
      return;
    }
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
    this.saved.emit({ year, month, values: values.map(({ predictorGuid, amount }) => ({ predictorGuid, amount })) });
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
    this.validationError.set(undefined);
  }
}

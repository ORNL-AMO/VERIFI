import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import {
  PredictorWeatherWorkflowState,
  WeatherMaintenanceMode,
  WeatherMaintenancePreview,
  WeatherMaintenanceRequest,
  WeatherSourceCheck,
  validateWeatherMonthRange
} from '../../../models';

@Component({
  selector: 'app-weather-maintenance-slideout',
  templateUrl: './weather-maintenance-slideout.component.html',
  styleUrls: ['./weather-maintenance-slideout.component.css'],
  standalone: true,
  imports: [IconComponent, WorkspaceSlideoutComponent]
})
export class WeatherMaintenanceSlideoutComponent implements OnChanges {
  @Input() mode: WeatherMaintenanceMode = 'maintenance';
  @Input() defaultRange?: WeatherMonthRange;
  @Input() preview?: WeatherMaintenancePreview;
  @Input() workflowState: PredictorWeatherWorkflowState = { status: 'idle', message: '' };
  @Input() saving = false;
  @Output() previewRequested = new EventEmitter<WeatherMaintenanceRequest>();
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  readonly startMonth = signal('');
  readonly endMonth = signal('');
  readonly sourceCheck = signal<WeatherSourceCheck>('last-six');
  readonly requestError = signal<string | undefined>(undefined);
  readonly changedCount = computed(() => this.preview?.rows.filter(row => row.kind !== 'unchanged' && row.kind !== 'preserved-override').length ?? 0);
  readonly preservedCount = computed(() => this.preview?.rows.filter(row => row.kind === 'preserved-override').length ?? 0);
  readonly title = computed(() => this.mode === 'settings'
    ? 'Review recalculated readings'
    : this.mode === 'restore' ? 'Restore calculated reading' : 'Manage calculated data');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultRange'] && this.defaultRange && !this.startMonth() && !this.endMonth()) {
      this.startMonth.set(toMonthInput(this.defaultRange.start));
      this.endMonth.set(toMonthInput(this.defaultRange.end));
    }
  }

  requestPreview(): void {
    const range = rangeFromInputs(this.startMonth(), this.endMonth());
    const error = range ? validateWeatherMonthRange(range) : 'Enter a valid start and end month.';
    this.requestError.set(error);
    if (!range || error || this.saving) return;
    this.previewRequested.emit({ range, sourceCheck: this.sourceCheck() });
  }

  setSourceCheck(value: string): void {
    this.sourceCheck.set(value as WeatherSourceCheck);
  }
}

function rangeFromInputs(start: string, end: string): WeatherMonthRange | undefined {
  const startMonth = parseMonthInput(start);
  const endMonth = parseMonthInput(end);
  return startMonth && endMonth ? { start: startMonth, end: endMonth } : undefined;
}

function parseMonthInput(value: string): { year: number; month: number } | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : undefined;
}

function toMonthInput(month: { year: number; month: number }): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`;
}

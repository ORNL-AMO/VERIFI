import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherDataType } from '@data/models/idbModels/predictor';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { PredictorDraft, SupportedPredictorType, WEATHER_DATA_TYPE_OPTIONS, isDegreeDayType } from '../../models';
import {
  PredictorWeatherWorkflowState,
  WeatherPredictorDefinition,
  WeatherPredictorGenerationDraft,
  WeatherPredictorGenerationPreview,
  defaultWeatherPredictorName,
  validateWeatherMonthRange
} from '../../models';
import { WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import { WeatherStationSelectorComponent } from '../../shared/weather-station-selector/weather-station-selector.component';

@Component({
  selector: 'app-predictor-draft-slideout',
  templateUrl: './predictor-draft-slideout.component.html',
  styleUrls: ['./predictor-draft-slideout.component.css'],
  standalone: true,
  imports: [IconComponent, WorkspaceSlideoutComponent, WeatherStationSelectorComponent]
})
export class PredictorDraftSlideoutComponent implements OnChanges {
  @Input() saving = false;
  @Input() error: string | undefined;
  @Input() initialStationSearch = '';
  @Input() defaultWeatherRange?: WeatherMonthRange;
  @Input() weatherPreview?: WeatherPredictorGenerationPreview;
  @Input() workflowState: PredictorWeatherWorkflowState = { status: 'idle', message: '' };
  @Output() submitted = new EventEmitter<PredictorDraft>();
  @Output() weatherPreviewRequested = new EventEmitter<WeatherPredictorGenerationDraft>();
  @Output() weatherConfirmed = new EventEmitter<void>();
  @Output() draftChanged = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  readonly weatherTypes = WEATHER_DATA_TYPE_OPTIONS;
  readonly draft = signal<PredictorDraft>({
    name: '', production: false, predictorType: 'Standard', unit: '', weatherDataType: 'HDD', baseTemperature: 60
  });
  readonly weatherDefinitions = signal<readonly WeatherPredictorDefinition[]>([
    { weatherDataType: 'HDD', name: defaultWeatherPredictorName('HDD', 60), baseTemperature: 60 }
  ]);
  readonly weatherStart = signal('');
  readonly weatherEnd = signal('');
  readonly isWeather = computed(() => this.draft().predictorType === 'Weather');
  readonly canCancelWorkflow = computed(() => this.workflowState.status === 'loading' || this.workflowState.status === 'calculating');
  readonly isValid = computed(() => {
    const draft = this.draft();
    return draft.predictorType === 'Weather'
      ? this.isWeatherDraftValid()
      : draft.name.trim().length > 0
        && draft.name.trim().length <= 100
        && (!draft.unit || draft.unit.length <= 100);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultWeatherRange'] && this.defaultWeatherRange && !this.weatherStart() && !this.weatherEnd()) {
      this.weatherStart.set(toMonthInput(this.defaultWeatherRange.start));
      this.weatherEnd.set(toMonthInput(this.defaultWeatherRange.end));
    }
  }

  setName(value: string): void { this.patch({ name: value }); }
  setUnit(value: string): void { this.patch({ unit: value }); }
  setProduction(value: string): void { this.patch({ production: value === 'production' }); }
  setPredictorType(value: string): void { this.patch({ predictorType: value as SupportedPredictorType }); }
  selectStation(station: WeatherStation): void { this.patch({ weatherStation: station }); }
  setWeatherStart(value: string): void { this.weatherStart.set(value); this.draftChanged.emit(); }
  setWeatherEnd(value: string): void { this.weatherEnd.set(value); this.draftChanged.emit(); }

  isWeatherTypeSelected(type: WeatherDataType): boolean {
    return this.weatherDefinitions().some(definition => definition.weatherDataType === type);
  }

  toggleWeatherType(type: WeatherDataType, selected: boolean): void {
    this.weatherDefinitions.update(definitions => selected
      ? [...definitions, {
        weatherDataType: type,
        name: defaultWeatherPredictorName(type, isDegreeDayType(type) ? 60 : undefined),
        baseTemperature: isDegreeDayType(type) ? 60 : undefined
      }]
      : definitions.filter(definition => definition.weatherDataType !== type));
    this.draftChanged.emit();
  }

  setWeatherName(type: WeatherDataType, name: string): void {
    this.updateDefinition(type, { name });
  }

  setWeatherBaseTemperature(type: WeatherDataType, value: string): void {
    const baseTemperature = value === '' ? undefined : Number(value);
    this.updateDefinition(type, {
      baseTemperature,
      name: defaultWeatherPredictorName(type, baseTemperature)
    });
  }

  submit(): void {
    if (!this.isValid() || this.saving) return;
    if (this.isWeather()) {
      const weatherDraft = this.buildWeatherDraft();
      if (weatherDraft) this.weatherPreviewRequested.emit(weatherDraft);
    } else {
      this.submitted.emit(this.draft());
    }
  }

  confirmWeather(): void {
    if (this.weatherPreview && !this.saving) this.weatherConfirmed.emit();
  }

  backToWeatherSetup(): void {
    if (!this.saving) this.draftChanged.emit();
  }

  private patch(update: Partial<PredictorDraft>): void {
    this.draft.update(current => ({ ...current, ...update }));
    this.draftChanged.emit();
  }

  private updateDefinition(type: WeatherDataType, update: Partial<WeatherPredictorDefinition>): void {
    this.weatherDefinitions.update(definitions => definitions.map(definition => definition.weatherDataType === type
      ? { ...definition, ...update }
      : definition));
    this.draftChanged.emit();
  }

  private isWeatherDraftValid(): boolean {
    const draft = this.draft();
    const range = monthRangeFromInputs(this.weatherStart(), this.weatherEnd());
    return !!draft.weatherStation
      && this.weatherDefinitions().length > 0
      && this.weatherDefinitions().every(definition => definition.name.trim().length > 0
        && definition.name.trim().length <= 100
        && (!isDegreeDayType(definition.weatherDataType) || Number.isFinite(definition.baseTemperature)))
      && !!range
      && !validateWeatherMonthRange(range);
  }

  private buildWeatherDraft(): WeatherPredictorGenerationDraft | undefined {
    const station = this.draft().weatherStation;
    const range = monthRangeFromInputs(this.weatherStart(), this.weatherEnd());
    if (!station || !range) return undefined;
    return {
      production: this.draft().production,
      station,
      range,
      definitions: this.weatherDefinitions()
    };
  }
}

function monthRangeFromInputs(start: string, end: string): WeatherMonthRange | undefined {
  const startMonth = parseMonthInput(start);
  const endMonth = parseMonthInput(end);
  return startMonth && endMonth ? { start: startMonth, end: endMonth } : undefined;
}

function parseMonthInput(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : undefined;
}

function toMonthInput(month: { year: number; month: number }): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`;
}

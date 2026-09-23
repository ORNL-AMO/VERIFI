import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherDataType } from '@data/models/idbModels/predictor';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { PredictorDraft, SupportedPredictorType, WEATHER_DATA_TYPE_OPTIONS, isDegreeDayType } from '../../models';
import { WeatherStationSelectorComponent } from '../../shared/weather-station-selector/weather-station-selector.component';

@Component({
  selector: 'app-predictor-draft-slideout',
  templateUrl: './predictor-draft-slideout.component.html',
  styleUrls: ['./predictor-draft-slideout.component.css'],
  standalone: true,
  imports: [IconComponent, WorkspaceSlideoutComponent, WeatherStationSelectorComponent]
})
export class PredictorDraftSlideoutComponent {
  @Input() saving = false;
  @Input() error: string | undefined;
  @Input() initialStationSearch = '';
  @Output() submitted = new EventEmitter<PredictorDraft>();
  @Output() cancelled = new EventEmitter<void>();

  readonly weatherTypes = WEATHER_DATA_TYPE_OPTIONS;
  readonly draft = signal<PredictorDraft>({
    name: '', production: false, predictorType: 'Standard', unit: '', weatherDataType: 'HDD', baseTemperature: 60
  });
  readonly isWeather = computed(() => this.draft().predictorType === 'Weather');
  readonly needsBaseTemperature = computed(() => isDegreeDayType(this.draft().weatherDataType));
  readonly isValid = computed(() => {
    const draft = this.draft();
    return draft.name.trim().length > 0
      && draft.name.trim().length <= 100
      && (!draft.unit || draft.unit.length <= 100)
      && (draft.predictorType === 'Standard'
        || !!draft.weatherStation && !!draft.weatherDataType
          && (!isDegreeDayType(draft.weatherDataType) || Number.isFinite(draft.baseTemperature)));
  });

  setName(value: string): void { this.patch({ name: value }); }
  setUnit(value: string): void { this.patch({ unit: value }); }
  setProduction(value: string): void { this.patch({ production: value === 'production' }); }
  setPredictorType(value: string): void { this.patch({ predictorType: value as SupportedPredictorType }); }
  setWeatherDataType(value: string): void { this.patch({ weatherDataType: value as WeatherDataType }); }
  setBaseTemperature(value: string): void { this.patch({ baseTemperature: value === '' ? undefined : Number(value) }); }
  selectStation(station: WeatherStation): void { this.patch({ weatherStation: station }); }

  submit(): void {
    if (this.isValid() && !this.saving) this.submitted.emit(this.draft());
  }

  private patch(update: Partial<PredictorDraft>): void {
    this.draft.update(current => ({ ...current, ...update }));
  }
}

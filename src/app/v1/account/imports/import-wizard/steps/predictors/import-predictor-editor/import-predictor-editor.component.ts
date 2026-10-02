import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { PredictorSettingsFormComponent } from '@app/v1/shared/predictor-settings/predictor-settings-form.component';
import {
  PredictorSettingsForm,
  PredictorSettingsFormService
} from '@app/v1/shared/predictor-settings/predictor-settings-form.service';
import { TooltipComponent } from '@app/v1/shared/tooltip/tooltip.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';

export interface ImportPredictorEditResult {
  readonly originalGuid: string;
  readonly predictor: IdbPredictor;
}

interface ExistingPredictorOption {
  readonly predictor: IdbPredictor;
  readonly label: string;
}

@Component({
  selector: 'app-import-predictor-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PredictorSettingsFormComponent,
    TooltipComponent,
    WorkspaceSlideoutComponent
  ],
  templateUrl: './import-predictor-editor.component.html',
  styleUrls: ['./import-predictor-editor.component.css']
})
export class ImportPredictorEditorComponent implements OnChanges {
  private readonly formService = inject(PredictorSettingsFormService);

  @Input({ required: true }) predictor: IdbPredictor;
  @Input({ required: true }) facility: IdbFacility;
  @Input() existingPredictors: readonly IdbPredictor[] = [];
  @Output() saved = new EventEmitter<ImportPredictorEditResult>();
  @Output() cancelled = new EventEmitter<void>();

  form: PredictorSettingsForm | undefined;
  workingPredictor: IdbPredictor;
  existingOptions: readonly ExistingPredictorOption[] = [];
  saveMessage = 'Changes are applied to this upload when you save.';
  private originalGuid: string;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['predictor'] && this.predictor) {
      this.originalGuid = this.predictor.guid;
      this.setWorkingPredictor(this.predictor);
    }
    if (changes['existingPredictors']) this.prepareExistingOptions();
  }

  selectExisting(guid: string): void {
    if (!guid) {
      this.setWorkingPredictor(this.predictor);
      return;
    }
    const existing = this.existingPredictors.find(candidate => candidate.guid === guid);
    if (!existing) return;
    const importWizardName = this.workingPredictor.importWizardName;
    const skipImport = this.workingPredictor.skipImport;
    this.setWorkingPredictor({ ...structuredClone(existing), importWizardName, skipImport });
  }

  save(): void {
    let updated = structuredClone(this.workingPredictor);
    if (updated.predictorType === 'Standard') {
      if (!this.form) return;
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.saveMessage = 'Resolve validation issues before saving this predictor.';
        return;
      }
      updated = this.formService.updatePredictor(updated, this.form);
      updated.productionInAnalysis = updated.production;
    }
    this.saved.emit({ originalGuid: this.originalGuid, predictor: updated });
  }

  weatherMetricLabel(type: WeatherDataType): string {
    return WEATHER_METRIC_LABELS[type];
  }

  weatherBaseLabel(predictor: IdbPredictor): string {
    if (predictor.weatherDataType === 'HDD') return `${predictor.heatingBaseTemperature} °F heating base`;
    if (predictor.weatherDataType === 'CDD') return `${predictor.coolingBaseTemperature} °F cooling base`;
    return 'Not applicable';
  }

  private setWorkingPredictor(predictor: IdbPredictor): void {
    this.workingPredictor = structuredClone(predictor);
    this.form = this.workingPredictor.predictorType === 'Standard'
      ? this.formService.build(this.workingPredictor)
      : undefined;
    this.saveMessage = 'Changes are applied to this upload when you save.';
  }

  private prepareExistingOptions(): void {
    this.existingOptions = this.existingPredictors.map(predictor => ({
      predictor,
      label: predictor.predictorType === 'Weather'
        ? `${predictor.name} — Weather · ${predictor.weatherStationName || predictor.weatherStationId} · ${WEATHER_METRIC_LABELS[predictor.weatherDataType]}`
        : `${predictor.name} — Standard`
    }));
  }
}

const WEATHER_METRIC_LABELS: Record<WeatherDataType, string> = {
  HDD: 'Heating degree days',
  CDD: 'Cooling degree days',
  relativeHumidity: 'Relative humidity',
  dryBulbTemp: 'Dry bulb temperature',
  wetBulbTemp: 'Wet bulb temperature',
  dewPointTemp: 'Dew point temperature',
  precipitation: 'Precipitation'
};

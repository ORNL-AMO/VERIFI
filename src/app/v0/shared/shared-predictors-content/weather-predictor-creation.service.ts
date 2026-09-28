import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { PredictorCommandHandler } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { DetailDegreeDay } from '@data/models/degreeDays';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbPredictor, IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from '@data/models/idbModels/predictorData';
import { Month, Months } from '@shared/form-data/months';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { getDegreeDayAmount } from '@shared/sharedHelperFunctions';
import { EditPredictorFormService } from '@v0/shared/shared-predictors-content/edit-predictor-form.service';
import { WeatherDataReading, WeatherDataService } from '@v0/weather-data/weather-data.service';
import { getDetailedDataForMonth, hasWeatherDataWarning } from '@v0/weather-data/weatherDataCalculations';

export interface WeatherPredictorCreationOptions {
  predictorForm: FormGroup;
  facility: IdbFacility;
  activeAccountGuid: string;
  weatherStationName: string;
  existingPredictor?: IdbPredictor;
  shouldStop?: () => boolean;
}

@Injectable({ providedIn: 'root' })
export class WeatherPredictorCreationService {
  constructor(
    private editPredictorFormService: EditPredictorFormService,
    private predictorHandler: PredictorCommandHandler,
    private analysisHandler: AnalysisCommandHandler,
    private weatherDataService: WeatherDataService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService
  ) { }

  async createFromForm(options: WeatherPredictorCreationOptions): Promise<Array<IdbPredictor>> {
    const selectedTypes = this.editPredictorFormService.getSelectedWeatherTypes(options.predictorForm);
    const persistedPredictors: Array<IdbPredictor> = [];

    for (let index = 0; index < selectedTypes.length; index++) {
      const type = selectedTypes[index];
      const usesExistingPredictor = index === 0 && options.existingPredictor !== undefined;
      const predictor = usesExistingPredictor
        ? options.existingPredictor
        : getNewIdbPredictor(options.facility.accountId, options.facility.guid);

      this.setWeatherPredictorFromForm(
        predictor,
        type,
        options.predictorForm,
        options.weatherStationName
      );

      const persistedPredictor = usesExistingPredictor
        ? await this.predictorHandler.updatePredictor(predictor, options.activeAccountGuid)
        : await this.predictorHandler.addPredictor(predictor, options.activeAccountGuid);

      persistedPredictors.push(persistedPredictor);
      await this.addWeatherDataForPredictor(persistedPredictor, options);
    }

    await this.analysisHandler.upsertAnalysisPredictors(persistedPredictors);

    return persistedPredictors;
  }

  private setWeatherPredictorFromForm(
    predictor: IdbPredictor,
    type: WeatherDataType,
    predictorForm: FormGroup,
    weatherStationName: string
  ) {
    predictor.name = this.editPredictorFormService.getWeatherNameForType(type, predictorForm);
    predictor.unit = predictorForm.controls.unit.value;
    predictor.description = predictorForm.controls.description.value;
    predictor.production = predictorForm.controls.production.value;
    predictor.predictorType = 'Weather';
    predictor.weatherStationId = predictorForm.controls.weatherStationId.value;
    predictor.weatherStationName = weatherStationName;
    predictor.weatherDataType = type;
    predictor.heatingBaseTemperature = predictorForm.controls.heatingBaseTemperature.value;
    predictor.coolingBaseTemperature = predictorForm.controls.coolingBaseTemperature.value;
  }

  private async addWeatherDataForPredictor(
    targetPredictor: IdbPredictor,
    options: WeatherPredictorCreationOptions
  ) {
    const predictorForm = options.predictorForm;
    const startMonth = predictorForm.controls.startMonth.value;
    const startYear = predictorForm.controls.startYear.value;
    const endMonth = predictorForm.controls.endMonth.value;
    const endYear = predictorForm.controls.endYear.value;

    if (startMonth == null || !startYear || endMonth == null || !endYear) {
      return;
    }

    const startDate = new Date(startYear, startMonth, 1);
    const endDate = new Date(endYear, endMonth, 1);
    if (startDate > endDate) {
      return;
    }

    const parsedData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(
      targetPredictor.weatherStationId,
      startDate,
      endDate,
      []
    );

    if (parsedData === 'error') {
      this.toastNotificationService.weatherDataErrorToast();
      return;
    }

    while (startDate <= endDate) {
      if (options.shouldStop?.()) {
        break;
      }

      const entryDate = new Date(startDate);
      const month: Month = Months.find(item => item.monthNumValue === entryDate.getMonth());
      this.loadingService.setLoadingMessage(`Adding Weather Predictors: ${month.abbreviation}, ${entryDate.getFullYear()}`);

      const degreeDays: Array<DetailDegreeDay> = getDetailedDataForMonth(
        parsedData,
        entryDate.getMonth(),
        entryDate.getFullYear(),
        targetPredictor.heatingBaseTemperature,
        targetPredictor.coolingBaseTemperature,
        targetPredictor.weatherStationId,
        targetPredictor.weatherStationName
      );

      const newPredictorData: IdbPredictorData = getNewIdbPredictorData(targetPredictor);
      newPredictorData.year = entryDate.getFullYear();
      newPredictorData.month = entryDate.getMonth() + 1;
      newPredictorData.amount = getDegreeDayAmount(degreeDays, targetPredictor.weatherDataType);
      newPredictorData.weatherDataWarning = hasWeatherDataWarning(degreeDays, targetPredictor.weatherDataType);

      await this.predictorHandler.addPredictorData(newPredictorData, options.activeAccountGuid);
      startDate.setMonth(startDate.getMonth() + 1);
    }
  }
}

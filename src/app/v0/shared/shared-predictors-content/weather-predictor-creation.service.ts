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

interface WeatherDataRange {
  startDate: Date;
  endDate: Date;
  readings: Array<WeatherDataReading>;
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
    const predictors: Array<IdbPredictor> = [];
    const predictorData: Array<IdbPredictorData> = [];
    const weatherDataRange = selectedTypes.length > 0
      ? await this.getWeatherDataRange(options)
      : undefined;

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

      predictors.push(predictor);
      predictorData.push(...this.buildWeatherDataForPredictor(predictor, options, weatherDataRange));
    }

    const facilityAnalyses = this.analysisHandler.buildUpsertedAnalysisPredictors(predictors);
    await this.predictorHandler.createWeatherPredictors(
      { predictors, predictorData, facilityAnalyses },
      options.activeAccountGuid
    );

    return predictors;
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

  private buildWeatherDataForPredictor(
    targetPredictor: IdbPredictor,
    options: WeatherPredictorCreationOptions,
    weatherDataRange: WeatherDataRange | undefined
  ): Array<IdbPredictorData> {
    if (!weatherDataRange) {
      return [];
    }

    const predictorData: Array<IdbPredictorData> = [];
    const startDate = new Date(weatherDataRange.startDate);
    const endDate = weatherDataRange.endDate;

    while (startDate <= endDate) {
      if (options.shouldStop?.()) {
        break;
      }

      const entryDate = new Date(startDate);
      const month: Month = Months.find(item => item.monthNumValue === entryDate.getMonth());
      this.loadingService.setLoadingMessage(`Adding Weather Predictors: ${month.abbreviation}, ${entryDate.getFullYear()}`);

      const degreeDays: Array<DetailDegreeDay> = getDetailedDataForMonth(
        weatherDataRange.readings,
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

      predictorData.push(newPredictorData);
      startDate.setMonth(startDate.getMonth() + 1);
    }

    return predictorData;
  }

  private async getWeatherDataRange(options: WeatherPredictorCreationOptions): Promise<WeatherDataRange | undefined> {
    const predictorForm = options.predictorForm;
    const startMonth = predictorForm.controls.startMonth.value;
    const startYear = predictorForm.controls.startYear.value;
    const endMonth = predictorForm.controls.endMonth.value;
    const endYear = predictorForm.controls.endYear.value;

    if (startMonth == null || !startYear || endMonth == null || !endYear) {
      return undefined;
    }

    const startDate = new Date(startYear, startMonth, 1);
    const endDate = new Date(endYear, endMonth, 1);
    if (startDate > endDate) {
      return undefined;
    }

    const readings: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(
      predictorForm.controls.weatherStationId.value,
      startDate,
      endDate,
      []
    );

    if (readings === 'error') {
      this.toastNotificationService.weatherDataErrorToast();
      throw new Error('Weather data could not be retrieved for predictor creation.');
    }

    return { startDate, endDate, readings };
  }
}

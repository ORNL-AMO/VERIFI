import { Injectable, computed, inject, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import {
  buildFacilityAnalysesWithoutPredictors,
  buildFacilityAnalysisPredictorUpdates,
  buildFacilityAnalysesWithPredictors
} from '@data/account-workspace/handlers/analysis-command-handler.service';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { WeatherStation } from '@data/models/degreeDays';
import { HourlyWeatherDataService } from '@platform/weather/hourly-weather-data.service';
import { WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import {
  PredictorWeatherWorkflowState,
  WeatherMaintenancePreview,
  WeatherMaintenanceRequest,
  WeatherPredictorGenerationDraft,
  WeatherPredictorGenerationPreview,
  WeatherPredictorDefinition,
  WeatherStationSelectionPreview,
  WeatherStationGroupDraft,
  WeatherStationGroupPreview,
  buildWeatherGenerationPreview,
  buildWeatherMaintenancePreview,
  buildWeatherStationSelectionPreview,
  buildWeatherStationGroupPreview,
  weatherRangeForReadings
} from './models';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';

@Injectable()
export class PredictorWeatherWorkflowService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly hourlyWeather = inject(HourlyWeatherDataService);
  private readonly actions = inject(PredictorWorkspaceActionsService);

  readonly state = signal<PredictorWeatherWorkflowState>({ status: 'idle', message: '' });
  readonly busy = computed(() => ['loading', 'calculating', 'committing'].includes(this.state().status));

  private requestToken = 0;
  private cancellation?: Subject<void>;

  async previewGeneration(
    draft: WeatherPredictorGenerationDraft
  ): Promise<WeatherPredictorGenerationPreview | undefined> {
    const account = this.workspace.account();
    const facility = this.workspace.selectedFacility();
    if (!account || !facility) {
      this.fail('Select an account and facility before generating weather predictors.');
      return undefined;
    }
    return this.loadPreview(
      draft.station.ID,
      draft.range,
      'Loading hourly weather data…',
      hourly => buildWeatherGenerationPreview(
        draft,
        hourly,
        account.guid,
        facility.guid,
        this.workspace.revision()
      )
    );
  }

  async previewMaintenance(
    predictor: IdbPredictor,
    readings: readonly IdbPredictorData[],
    request: WeatherMaintenanceRequest
  ): Promise<WeatherMaintenancePreview | undefined> {
    return this.loadPreview(
      predictor.weatherStationId,
      request.range,
      'Loading weather data for the requested range…',
      hourly => buildWeatherMaintenancePreview(
        predictor,
        readings,
        request,
        hourly,
        this.workspace.revision(),
        'maintenance'
      )
    );
  }

  async previewStationGroup(
    draft: WeatherStationGroupDraft,
    currentPredictors: readonly IdbPredictor[] = [],
    currentReadings: readonly IdbPredictorData[] = []
  ): Promise<WeatherStationGroupPreview | undefined> {
    const account = this.workspace.account();
    const facility = this.workspace.selectedFacility();
    if (!account || !facility) {
      this.fail('Select an account and facility before managing weather predictors.');
      return undefined;
    }
    const currentIds = new Set(currentPredictors.map(predictor => predictor.guid));
    const conflict = this.workspace.facilityPredictors().find(predictor =>
      predictor.predictorType === 'Weather'
      && predictor.weatherStationId === draft.station.ID
      && !currentIds.has(predictor.guid));
    if (conflict) {
      this.fail('That weather station already has a workbench. Open the existing station instead.');
      return undefined;
    }
    if (draft.definitions.length === 0) {
      return this.withReviewedAnalyses(buildWeatherStationGroupPreview(
        draft,
        currentPredictors,
        currentReadings,
        [],
        account.guid,
        facility.guid,
        this.workspace.revision()
      ));
    }
    return this.loadPreview(
      draft.station.ID,
      draft.range,
      'Loading hourly weather data for this station…',
      hourly => this.withReviewedAnalyses(buildWeatherStationGroupPreview(
        draft,
        currentPredictors,
        currentReadings,
        hourly,
        account.guid,
        facility.guid,
        this.workspace.revision()
      ))
    );
  }

  async previewStationSelection(
    station: WeatherStation,
    range: WeatherMonthRange,
    definitions: readonly WeatherPredictorDefinition[]
  ): Promise<WeatherStationSelectionPreview | undefined> {
    return this.loadPreview(
      station.ID,
      range,
      'Loading predictor data for this station…',
      hourly => buildWeatherStationSelectionPreview(station, range, definitions, hourly)
    );
  }

  async previewSettingsChange(
    currentPredictor: IdbPredictor,
    proposedPredictor: IdbPredictor,
    readings: readonly IdbPredictorData[]
  ): Promise<WeatherMaintenancePreview | undefined> {
    const range = weatherRangeForReadings(readings);
    if (!range) {
      this.fail('Calculated settings can be saved directly when no readings exist.');
      return undefined;
    }
    return this.loadPreview(
      proposedPredictor.weatherStationId,
      range,
      'Loading weather data for the proposed settings…',
      hourly => buildWeatherMaintenancePreview(
        currentPredictor,
        readings,
        { range, sourceCheck: 'all' },
        hourly,
        this.workspace.revision(),
        'settings',
        proposedPredictor
      )
    );
  }

  async previewRestore(
    predictor: IdbPredictor,
    reading: IdbPredictorData
  ): Promise<WeatherMaintenancePreview | undefined> {
    const range: WeatherMonthRange = {
      start: { year: reading.year, month: reading.month },
      end: { year: reading.year, month: reading.month }
    };
    return this.loadPreview(
      predictor.weatherStationId,
      range,
      'Loading weather data for the manual override…',
      hourly => buildWeatherMaintenancePreview(
        predictor,
        [reading],
        { range, sourceCheck: 'all' },
        hourly,
        this.workspace.revision(),
        'restore'
      )
    );
  }

  async commitGeneration(preview: WeatherPredictorGenerationPreview): Promise<readonly IdbPredictor[]> {
    return this.commit('Creating weather predictors…', async () => {
      await this.actions.createWeatherPredictors(preview);
      return preview.predictors;
    });
  }

  async commitMaintenance(preview: WeatherMaintenancePreview): Promise<void> {
    await this.commit('Applying calculated reading changes…', () => this.actions.applyWeatherMaintenance(preview));
  }

  async commitStationGroup(preview: WeatherStationGroupPreview): Promise<void> {
    await this.commit('Saving weather station predictors…', () => this.actions.applyWeatherStationGroup(preview));
  }

  async commitSettings(preview: WeatherMaintenancePreview): Promise<void> {
    await this.commit('Saving settings and recalculated readings…', () => this.actions.applyWeatherSettings(preview));
  }

  cancel(): void {
    this.requestToken++;
    this.cancellation?.next();
    this.cancellation?.complete();
    this.cancellation = undefined;
    this.state.set({ status: 'cancelled', message: 'Weather operation cancelled.' });
  }

  reset(): void {
    if (this.busy()) this.cancel();
    this.state.set({ status: 'idle', message: '' });
  }

  private async loadPreview<T>(
    stationId: string,
    range: WeatherMonthRange,
    loadingMessage: string,
    build: (hourly: Parameters<typeof buildWeatherGenerationPreview>[1]) => T
  ): Promise<T | undefined> {
    this.cancelActiveRequest();
    const token = ++this.requestToken;
    const cancellation = new Subject<void>();
    this.cancellation = cancellation;
    this.state.set({ status: 'loading', message: loadingMessage });
    try {
      const hourly = await firstValueFrom(
        this.hourlyWeather.load({ stationId, range }).pipe(takeUntil(cancellation)),
        { defaultValue: undefined }
      );
      if (token !== this.requestToken || !hourly) return undefined;
      if (hourly.length === 0) throw new Error('No hourly weather data is available for the requested range.');
      this.state.set({ status: 'calculating', message: 'Calculating monthly weather values…' });
      await Promise.resolve();
      const preview = build(hourly);
      if (token !== this.requestToken) return undefined;
      this.state.set({ status: 'preview-ready', message: 'Review the calculated changes before applying them.' });
      return preview;
    } catch (error) {
      if (token !== this.requestToken) return undefined;
      this.fail(error instanceof Error ? error.message : 'Weather data could not be loaded.');
      return undefined;
    } finally {
      if (token === this.requestToken) this.cancellation = undefined;
      cancellation.complete();
    }
  }

  private async commit<T>(message: string, operation: () => Promise<T>): Promise<T> {
    this.state.set({ status: 'committing', message });
    try {
      const result = await operation();
      this.state.set({ status: 'idle', message: 'Weather changes saved.' });
      return result;
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Weather changes could not be saved.');
      throw error;
    }
  }

  private withReviewedAnalyses(preview: WeatherStationGroupPreview): WeatherStationGroupPreview {
    const facility = this.workspace.selectedFacility();
    if (!facility) return preview;
    const current = this.workspace.facilityAnalyses()
      .filter(analysis => analysis.facilityId === facility.guid);
    let proposed = buildFacilityAnalysesWithoutPredictors(
      current,
      new Set(preview.deletePredictors.map(predictor => predictor.guid))
    );
    for (const predictor of preview.updatePredictors) {
      proposed = buildFacilityAnalysisPredictorUpdates(proposed, predictor);
    }
    proposed = buildFacilityAnalysesWithPredictors(proposed, preview.addPredictors);
    return {
      ...preview,
      facilityAnalyses: proposed.filter((analysis, index) =>
        JSON.stringify(analysis.groups) !== JSON.stringify(current[index]?.groups))
    };
  }

  private cancelActiveRequest(): void {
    if (!this.cancellation) return;
    this.requestToken++;
    this.cancellation.next();
    this.cancellation.complete();
    this.cancellation = undefined;
  }

  private fail(message: string): void {
    this.state.set({ status: 'error', message, error: message });
  }
}

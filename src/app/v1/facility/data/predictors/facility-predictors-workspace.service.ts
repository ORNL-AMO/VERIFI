import { Injectable, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import { PredictorBrowseItem, buildPredictorCards, buildWeatherStationGroups } from './models';
import { PredictorWeatherWorkflowService } from './predictor-weather-workflow.service';

@Injectable()
export class FacilityPredictorsWorkspaceService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly weatherWorkflow = inject(PredictorWeatherWorkflowService);

  readonly account = this.workspace.account;
  readonly revision = this.workspace.revision;
  readonly workspaceState = this.workspace.status;
  readonly isLoading = computed(() => ['idle', 'loading', 'switching'].includes(this.workspaceState()));
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = computed(() => this.workspace.hasPending() || this.weatherWorkflow.busy());
  readonly defaultWeatherRange = computed<WeatherMonthRange | undefined>(() => {
    const readings = this.workspace.facilityMeterData()
      .filter(reading => Number.isInteger(reading.year) && reading.year > 0
        && Number.isInteger(reading.month) && reading.month >= 1 && reading.month <= 12)
      .sort((first, second) => first.year * 12 + first.month - (second.year * 12 + second.month));
    if (readings.length === 0) return undefined;
    return {
      start: { year: readings[0].year, month: readings[0].month },
      end: { year: readings[readings.length - 1].year, month: readings[readings.length - 1].month }
    };
  });
  readonly predictors = computed(() => [...this.workspace.facilityPredictors()]
    .sort((first, second) => (first.name || '').localeCompare(second.name || '')));
  readonly predictorReadings = computed(() => [...this.workspace.facilityPredictorData()]);
  readonly predictorCards = computed(() => buildPredictorCards(
    this.predictors(),
    this.predictorReadings(),
    this.status.items(),
    this.status.state() === 'ready'
  ));
  readonly standardPredictorCards = computed(() => this.predictorCards()
    .filter(card => card.predictor.predictorType !== 'Weather'));
  readonly weatherStationGroups = computed(() => buildWeatherStationGroups(
    this.predictors(),
    this.predictorReadings(),
    this.status.items(),
    this.status.state() === 'ready'
  ));
  readonly browseItems = computed<readonly PredictorBrowseItem[]>(() => [
    ...this.standardPredictorCards().map(card => ({ kind: 'standard' as const, card })),
    ...this.weatherStationGroups().map(group => ({ kind: 'weather' as const, group }))
  ]);
}

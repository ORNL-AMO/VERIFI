import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import { buildPredictorCards } from './models';
import { PredictorWeatherWorkflowService } from './predictor-weather-workflow.service';

@Injectable()
export class FacilityPredictorsWorkspaceService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly weatherWorkflow = inject(PredictorWeatherWorkflowService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUrl = signal(this.router.url);

  readonly account = this.workspace.account;
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
  readonly selectedPredictorGuid = computed(() => parseSelectedPredictorGuid(this.currentUrl()));
  readonly selectedPredictor = computed(() => {
    const guid = this.selectedPredictorGuid();
    return guid ? this.predictors().find(predictor => predictor.guid === guid) : undefined;
  });
  readonly selectedReadings = computed(() => {
    const guid = this.selectedPredictorGuid();
    return guid ? this.predictorReadings().filter(reading => reading.predictorId === guid) : [];
  });
  readonly selectedPredictorCard = computed(() => {
    const guid = this.selectedPredictorGuid();
    return guid ? this.predictorCards().find(card => card.predictor.guid === guid) : undefined;
  });
  readonly hasPredictorRoute = computed(() => !!this.selectedPredictorGuid());
  readonly predictorNotFound = computed(() => this.hasPredictorRoute() && !this.selectedPredictor());

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => this.currentUrl.set(event.urlAfterRedirects));
  }
}

function parseSelectedPredictorGuid(url: string): string | undefined {
  const parts = url.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  const index = parts.findIndex((part, partIndex) => part === 'predictors' && parts[partIndex - 1] === 'data');
  const guid = index >= 0 ? parts[index + 1] : undefined;
  if (!guid) return undefined;
  try {
    return decodeURIComponent(guid);
  } catch {
    return guid;
  }
}

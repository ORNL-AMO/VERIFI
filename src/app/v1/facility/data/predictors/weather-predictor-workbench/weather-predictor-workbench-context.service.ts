import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';

@Injectable()
export class WeatherPredictorWorkbenchContextService {
  private readonly route = inject(ActivatedRoute);
  private readonly workspace = inject(FacilityPredictorsWorkspaceService);
  private readonly routeParameters = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap
  });
  private readonly routeUrl = toSignal(this.route.url, { initialValue: this.route.snapshot.url });

  readonly creating = computed(() => this.routeUrl().some(segment => segment.path === 'new'));
  readonly groupKey = computed(() => this.routeParameters().get('weatherGroupKey') ?? undefined);
  readonly group = computed(() => {
    const key = this.groupKey();
    return key ? this.workspace.weatherStationGroups().find(group => group.routeKey === key) : undefined;
  });
  readonly predictors = computed(() => this.group()?.predictors ?? []);
  readonly readings = computed(() => {
    const predictorIds = new Set(this.predictors().map(predictor => predictor.guid));
    return this.workspace.predictorReadings().filter(reading => predictorIds.has(reading.predictorId));
  });
  readonly notFound = computed(() => !!this.groupKey() && !this.group());
}

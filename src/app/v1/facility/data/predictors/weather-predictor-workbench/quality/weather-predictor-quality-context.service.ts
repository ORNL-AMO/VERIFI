import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorQualityContext } from '../../predictor-quality-context';
import { WeatherPredictorWorkbenchContextService } from '../weather-predictor-workbench-context.service';

@Injectable()
export class WeatherPredictorQualityContextService implements PredictorQualityContext {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(FacilityPredictorsWorkspaceService);
  private readonly weatherContext = inject(WeatherPredictorWorkbenchContextService);
  private readonly routeParameters = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap
  });

  readonly predictor = computed(() => {
    const predictors = this.weatherContext.predictors();
    const predictorGuid = this.routeParameters().get('predictorGuid');
    return predictorGuid
      ? predictors.find(predictor => predictor.guid === predictorGuid)
      : predictors[0];
  });
  readonly readings = computed(() => {
    const predictor = this.predictor();
    return predictor
      ? this.weatherContext.readings().filter(reading => reading.predictorId === predictor.guid)
      : [];
  });
  readonly findings = computed(() => {
    const predictor = this.predictor();
    return predictor
      ? this.weatherContext.group()?.statusFindings.filter(finding =>
        finding.entity.kind === 'predictor' && finding.entity.guid === predictor.guid) ?? []
      : [];
  });
  readonly idPrefix = computed(() =>
    `weather-quality-${safeId(this.predictor()?.guid ?? 'missing')}`);
  readonly settingsLabel = 'Open Setup';

  openReadings(): void { this.open('readings'); }
  openSettings(): void { this.open('setup'); }

  private open(tab: 'setup' | 'readings'): void {
    const facility = this.workspace.facility();
    const group = this.weatherContext.group();
    if (facility && group) {
      void this.router.navigate(this.navigation.facilityWeatherPredictorRoute(
        facility.guid,
        group.routeKey,
        tab
      ));
    }
  }
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

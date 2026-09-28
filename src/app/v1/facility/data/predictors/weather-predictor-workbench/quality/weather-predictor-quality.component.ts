import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkbenchQualityReportComponent } from '../../predictor-workbench/quality-report/predictor-workbench-quality-report.component';
import { WeatherPredictorWorkbenchContextService } from '../weather-predictor-workbench-context.service';

@Component({
  selector: 'app-weather-predictor-quality',
  templateUrl: './weather-predictor-quality.component.html',
  styleUrls: ['./weather-predictor-quality.component.css'],
  standalone: true,
  imports: [PredictorWorkbenchQualityReportComponent]
})
export class WeatherPredictorQualityComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly context = inject(WeatherPredictorWorkbenchContextService);
  private readonly routeParameters = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap
  });
  readonly selectedPredictor = computed(() => {
    const predictors = this.context.predictors();
    const predictorGuid = this.routeParameters().get('predictorGuid');
    return predictorGuid
      ? predictors.find(predictor => predictor.guid === predictorGuid)
      : predictors[0];
  });
  readonly readings = computed(() => {
    const predictor = this.selectedPredictor();
    return predictor
      ? this.context.readings().filter(reading => reading.predictorId === predictor.guid)
      : [];
  });
  readonly findings = computed(() => {
    const predictor = this.selectedPredictor();
    return predictor
      ? this.context.group()?.statusFindings.filter(finding =>
        finding.entity.kind === 'predictor' && finding.entity.guid === predictor.guid) ?? []
      : [];
  });
  readonly reportIdPrefix = computed(() => {
    const predictorGuid = this.selectedPredictor()?.guid ?? 'missing';
    return `weather-quality-${predictorGuid.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  });

  open(tab: 'setup' | 'readings'): void {
    const facility = this.workspace.facility();
    const group = this.context.group();
    if (facility && group) void this.router.navigate(this.navigation.facilityWeatherPredictorRoute(facility.guid, group.routeKey, tab));
  }
}

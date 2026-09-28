import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorQualityContext } from '../predictor-quality-context';

@Injectable()
export class PredictorWorkbenchContextService implements PredictorQualityContext {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(FacilityPredictorsWorkspaceService);
  private readonly status = inject(WorkspaceStatusService);
  private readonly routeParameters = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap
  });

  readonly predictorGuid = computed(() => this.routeParameters().get('predictorGuid') ?? undefined);
  readonly predictor = computed(() => {
    const guid = this.predictorGuid();
    return guid ? this.workspace.predictors().find(predictor => predictor.guid === guid) : undefined;
  });
  readonly readings = computed(() => {
    const guid = this.predictorGuid();
    return guid ? this.workspace.predictorReadings().filter(reading => reading.predictorId === guid) : [];
  });
  readonly card = computed(() => {
    const guid = this.predictorGuid();
    return guid ? this.workspace.predictorCards().find(card => card.predictor.guid === guid) : undefined;
  });
  readonly findings = computed(() => {
    const guid = this.predictorGuid();
    return guid ? this.status.predictorFindings(guid) : [];
  });
  readonly idPrefix = computed(() => `predictor-quality-${safeId(this.predictorGuid() ?? 'missing')}`);
  readonly settingsLabel = 'Open Settings';
  readonly notFound = computed(() => !!this.predictorGuid() && !this.predictor());

  openReadings(): void { this.openTab('readings'); }
  openSettings(): void { this.openTab('settings'); }

  private openTab(tab: 'settings' | 'readings'): void {
    const facility = this.workspace.facility();
    const predictor = this.predictor();
    if (facility && predictor) {
      void this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictor.guid, tab));
    }
  }
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

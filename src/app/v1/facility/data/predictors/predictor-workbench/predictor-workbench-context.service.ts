import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';

@Injectable()
export class PredictorWorkbenchContextService {
  private readonly route = inject(ActivatedRoute);
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
  readonly notFound = computed(() => !!this.predictorGuid() && !this.predictor());
}

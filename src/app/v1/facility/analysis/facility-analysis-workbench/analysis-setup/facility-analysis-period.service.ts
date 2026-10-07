import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { getLatestCompleteAnalysisYear, getYearsWithFullDataAnalysis } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';

@Injectable()
export class FacilityAnalysisPeriodService {
  private readonly context = inject(FacilityAnalysisWorkbenchContext);
  private readonly autosave = inject(FacilityAnalysisAutosaveService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly calendarizationBase = toSignal(this.calendarization.calendarizeBase(), {
    initialValue: IDLE_WORKSPACE_CALENDARIZATION
  });
  private readonly projection = computed(() => {
    const base = this.calendarizationBase();
    const facility = this.context.facility();
    const analysis = this.autosave.draft();
    if (base.state !== 'ready' || !facility || !analysis) return undefined;
    return this.calendarization.project(base, {
      context: { kind: 'facility', guid: facility.guid },
      energyUnit: analysis.energyUnit,
      waterUnit: analysis.waterUnit,
      energyIsSource: analysis.energyIsSource,
      includeEmissions: false
    });
  });

  readonly baselineYears = computed(() => {
    const analysis = this.autosave.draft();
    const facility = this.context.facility();
    const projection = this.projection();
    if (!analysis || !facility || projection?.state !== 'ready') return [];
    return getYearsWithFullDataAnalysis([...projection.meters], analysis, facility);
  });
  readonly latestCompleteYear = computed(() => Math.max(...this.baselineYears(), 0) || undefined);

  groupLatestCompleteYear(groupGuid: string): number | undefined {
    const analysis = this.autosave.draft();
    const facility = this.context.facility();
    const projection = this.projection();
    const group = analysis?.groups.find(item => item.idbGroupId === groupGuid);
    if (!analysis || !facility || !group || projection?.state !== 'ready') return undefined;
    return getLatestCompleteAnalysisYear(
      [group],
      [...projection.meters],
      this.context.workspace.predictorData().filter(item => item.facilityId === facility.guid),
      [facility]
    );
  }
}

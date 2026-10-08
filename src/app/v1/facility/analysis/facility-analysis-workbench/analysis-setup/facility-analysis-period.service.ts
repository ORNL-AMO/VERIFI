import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { getLatestCompleteAnalysisYear, getYearsWithFullDataAnalysis } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { AnalysisGroup } from '@data/models/analysis';
import { bankingGroupDependencyChain, BankingLatestCompleteYears, evaluateBankingSource } from '@shared/shared-analysis/banking-configuration';
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
    const group = analysis?.groups.find(item => item.idbGroupId === groupGuid);
    return group ? this.latestCompleteYearForGroups([group]) : undefined;
  }

  bankingLatestCompleteYears(groupGuid: string): BankingLatestCompleteYears {
    const analysis = this.autosave.draft();
    const analyses = this.context.analyses();
    const source = evaluateBankingSource(analysis, analyses).source;
    const sourceChain = source ? bankingGroupDependencyChain(source, groupGuid, analyses) : [];
    const sourceGroups = sourceChain.map(item => item.groups.find(group => group.idbGroupId === groupGuid));
    const completeSourceGroups = sourceGroups.every((group): group is AnalysisGroup => !!group && !isSkippedGroup(group))
      ? sourceGroups
      : [];
    return {
      consumer: this.groupLatestCompleteYear(groupGuid),
      source: completeSourceGroups.length === sourceChain.length && completeSourceGroups.length > 0
        ? this.latestCompleteYearForGroups(completeSourceGroups)
        : undefined
    };
  }

  private latestCompleteYearForGroups(groups: readonly AnalysisGroup[]): number | undefined {
    const facility = this.context.facility();
    const projection = this.projection();
    if (!facility || projection?.state !== 'ready' || groups.length === 0) return undefined;
    return getLatestCompleteAnalysisYear(
      [...groups],
      [...projection.meters],
      this.context.workspace.predictorData().filter(item => item.facilityId === facility.guid),
      [facility]
    );
  }
}

function isSkippedGroup(group: AnalysisGroup): boolean {
  return group.analysisType === 'skip' || group.analysisType === 'skipAnalysis';
}

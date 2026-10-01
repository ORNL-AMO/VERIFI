import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { EnergyUnitOptions, VolumeLiquidOptions } from '@shared/unitOptions';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { getYearsWithFullDataAnalysis } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { FacilityAnalysisAutosaveService } from '../facility-analysis-autosave.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';

@Component({
  selector: 'app-facility-analysis-setup',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './facility-analysis-setup.component.html',
  styleUrls: ['./facility-analysis-setup.component.css']
})
export class FacilityAnalysisSetupComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly autosave = inject(FacilityAnalysisAutosaveService);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly calendarizationBase = toSignal(this.calendarization.calendarizeBase(), { initialValue: { state: 'idle' as const, meters: [] } });
  readonly showClearModels = signal(false);
  readonly energyUnits = EnergyUnitOptions;
  readonly waterUnits = VolumeLiquidOptions;
  readonly draft = this.autosave.draft;
  readonly hasModels = computed(() => this.draft()?.groups.some(group => (group.models?.length ?? 0) > 0) ?? false);
  readonly projection = computed(() => {
    const base = this.calendarizationBase();
    const facility = this.context.facility();
    const analysis = this.draft();
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
    const analysis = this.draft();
    const facility = this.context.facility();
    const projection = this.projection();
    if (!analysis || !facility || projection?.state !== 'ready') return [];
    return getYearsWithFullDataAnalysis([...projection.meters], analysis, facility);
  });
  readonly latestCompleteYear = computed(() => Math.max(...this.baselineYears(), 0) || undefined);
  readonly baselineGoalWarning = computed(() => {
    const analysis = this.draft();
    const facility = this.context.facility();
    if (!analysis || !facility || !analysis.baselineYear) return undefined;
    const questions = facility.sustainabilityQuestions;
    const goal = analysis.analysisCategory === 'water' ? questions.waterReductionGoal : questions.energyReductionGoal;
    const goalYear = analysis.analysisCategory === 'water' ? questions.waterReductionBaselineYear : questions.energyReductionBaselineYear;
    return goal && goalYear !== analysis.baselineYear
      ? `This baseline does not match the facility ${analysis.analysisCategory} goal baseline (${goalYear}). Goal reports cannot use this analysis until they match.`
      : undefined;
  });
  readonly eligibleBankingSources = computed(() => {
    const analysis = this.draft();
    return analysis ? compatibleBankingSources(analysis, this.context.analyses()) : [];
  });
  readonly linkedAccountAnalyses = computed(() => {
    const analysis = this.draft();
    return analysis ? this.context.workspace.accountAnalyses().filter(item => item.facilityAnalysisItems?.some(link => link.analysisItemId === analysis.guid && link.facilityId === analysis.facilityId)) : [];
  });
  readonly linkedReports = computed(() => {
    const analysis = this.draft();
    return analysis ? this.context.workspace.selectedFacilityReports().filter(report => report.analysisItemId === analysis.guid) : [];
  });
  readonly bankingConsumers = computed(() => {
    const analysis = this.draft();
    return analysis ? this.context.analyses().filter(item => item.bankedAnalysisItemId === analysis.guid) : [];
  });

  setName(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.autosave.update(draft => { draft.name = name; }, { valid: name.trim().length > 0 });
  }

  setBoundary(energyIsSource: boolean): void {
    if (this.hasModels()) return;
    this.autosave.update(draft => { draft.energyIsSource = energyIsSource; draft.bankedAnalysisItemId = undefined; }, { immediate: true });
  }

  setValue(field: 'energyUnit' | 'waterUnit', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.autosave.update(draft => { draft[field] = value; }, { immediate: true, valid: !!value });
  }

  setBaseline(event: Event): void {
    if (this.hasModels()) return;
    const baselineYear = Number((event.target as HTMLSelectElement).value);
    this.autosave.update(draft => { draft.baselineYear = baselineYear; }, { immediate: true, valid: Number.isFinite(baselineYear) });
  }

  setHasBanking(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.autosave.update(draft => {
      draft.hasBanking = checked;
      if (!checked) draft.bankedAnalysisItemId = undefined;
    }, { immediate: true });
  }

  setBankingSource(event: Event): void {
    const guid = (event.target as HTMLSelectElement).value || undefined;
    this.autosave.update(draft => { draft.bankedAnalysisItemId = guid; }, { immediate: true, valid: !this.draft()?.hasBanking || !!guid });
  }

  clearModels(): void {
    this.autosave.update(clearAllRegressionModels, { immediate: true });
    this.showClearModels.set(false);
  }
}

export function clearAllRegressionModels(analysis: IdbAnalysisItem): void {
  analysis.groups.forEach(group => {
    group.models = undefined;
    group.selectedModelId = undefined;
    group.dateModelsGenerated = undefined;
    group.regressionConstant = undefined;
    group.regressionModelYear = undefined;
    group.predictorVariables.forEach(variable => { variable.regressionCoefficient = undefined; });
  });
  analysis.isAnalysisVisited = false;
}

export function compatibleBankingSources(
  analysis: IdbAnalysisItem,
  candidates: readonly IdbAnalysisItem[]
): readonly IdbAnalysisItem[] {
  return candidates.filter(candidate => candidate.guid !== analysis.guid
    && candidate.facilityId === analysis.facilityId
    && candidate.analysisCategory === analysis.analysisCategory
    && (analysis.analysisCategory === 'water' || candidate.energyIsSource === analysis.energyIsSource));
}

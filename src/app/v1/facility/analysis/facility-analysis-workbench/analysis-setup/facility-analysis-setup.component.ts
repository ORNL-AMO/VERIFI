import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { EnergyUnitOptions, VolumeLiquidOptions } from '@shared/unitOptions';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { getYearsWithFullDataAnalysis } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { invalidateAllRegressionModels } from '../group/regression/regression-draft';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';

@Component({
  selector: 'app-facility-analysis-setup',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, ConfirmationDialogComponent],
  templateUrl: './facility-analysis-setup.component.html',
  styleUrls: ['./facility-analysis-setup.component.css']
})
export class FacilityAnalysisSetupComponent implements OnDestroy {
  @ViewChild('clearModelsModal', { static: true }) private clearModelsModal!: TemplateRef<unknown>;

  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly autosave = inject(FacilityAnalysisAutosaveService);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
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
  setName(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.autosave.update(draft => { draft.name = name; }, { valid: name.trim().length > 0 });
  }

  setBoundary(energyIsSource: boolean): void {
    if (this.hasModels()) return;
    this.autosave.update(draft => { draft.energyIsSource = energyIsSource; draft.bankedAnalysisItemId = undefined; }, { immediate: true });
  }

  setValue(field: 'energyUnit' | 'waterUnit', value: string): void {
    if (this.hasModels()) return;
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
    this.autosave.update(invalidateAllRegressionModels, { immediate: true });
    this.closeClearModels();
  }

  requestClearModels(): void {
    this.showClearModels.set(true);
    this.modalPortal.show(new TemplatePortal(this.clearModelsModal, this.viewContainerRef));
  }

  closeClearModels(): void {
    if (!this.showClearModels()) return;
    this.showClearModels.set(false);
    this.modalPortal.hide();
  }

  ngOnDestroy(): void {
    this.closeClearModels();
  }
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

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalysisType } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { isSkippedAnalysisType } from '../facility-analysis-workbench.models';

@Component({ selector: 'app-facility-analysis-group-setup', standalone: true, imports: [RouterLink, IconComponent], templateUrl: './facility-analysis-group-setup.component.html', styleUrls: ['./facility-analysis-group-setup.component.css'] })
export class FacilityAnalysisGroupSetupComponent {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly workbench = this.groupContext.workbench;
  readonly autosave = this.groupContext.autosave;
  readonly group = this.groupContext.group;
  readonly analysis = this.autosave.draft;
  readonly pendingType = signal<AnalysisType | undefined>(undefined);
  readonly pendingPredictorId = signal<string | undefined>(undefined);
  readonly hasModels = computed(() => (this.group()?.models?.length ?? 0) > 0);
  readonly missingMeters = computed(() => this.groupContext.meters().length === 0);
  readonly productionVariables = computed(() => this.group()?.predictorVariables.filter(variable => variable.production) ?? []);
  readonly selectedProductionCount = computed(() => this.productionVariables().filter(variable => variable.productionInAnalysis).length);
  readonly isSkipped = computed(() => !!this.group() && isSkippedAnalysisType(this.group()!.analysisType));
  readonly adjustmentYears = computed(() => {
    const baseline = this.analysis()?.baselineYear;
    if (!baseline) return [];
    return Array.from({ length: Math.max(new Date().getFullYear() - baseline + 1, 1) }, (_, index) => baseline + index);
  });
  readonly availableDataAdjustmentYears = computed(() => {
    const used = new Set(this.group()?.dataAdjustments.map(item => item.year) ?? []);
    return this.adjustmentYears().filter(year => !used.has(year));
  });
  readonly availableBaselineAdjustmentYears = computed(() => {
    const used = new Set(this.group()?.baselineAdjustmentsV2.map(item => item.year) ?? []);
    return this.adjustmentYears().filter(year => !used.has(year));
  });
  readonly bankingYearError = computed(() => {
    const group = this.group();
    if (!group?.applyBanking) return undefined;
    if (!group.bankedAnalysisYear || !group.newBaselineYear) return 'Select both the applied banking year and the new baseline year.';
    return group.newBaselineYear <= group.bankedAnalysisYear ? 'The new baseline year must be after the applied banking year.' : undefined;
  });

  requestAnalysisType(type: AnalysisType): void {
    if (type === this.group()?.analysisType) return;
    if (this.hasModels()) this.pendingType.set(type);
    else this.applyAnalysisType(type);
  }

  confirmTypeChange(): void {
    const type = this.pendingType();
    if (type) this.applyAnalysisType(type);
    this.pendingType.set(undefined);
  }

  requestPredictor(predictorId: string): void {
    if (this.hasModels()) this.pendingPredictorId.set(predictorId);
    else this.togglePredictor(predictorId);
  }

  confirmPredictorChange(): void {
    const predictorId = this.pendingPredictorId();
    if (predictorId) this.togglePredictor(predictorId);
    this.pendingPredictorId.set(undefined);
  }

  setLegacyBaseloadMode(event: Event): void {
    const monthly = (event.target as HTMLSelectElement).value === 'monthly';
    this.updateGroup(group => { group.specifiedMonthlyPercentBaseload = monthly; }, true);
  }

  setAverageBaseload(event: Event): void {
    const amount = numericValue(event);
    this.updateGroup(group => { group.averagePercentBaseload = amount; }, false, amount !== undefined);
  }

  setMonthlyBaseload(month: number, event: Event): void {
    const amount = numericValue(event);
    this.updateGroup(group => {
      const entry = group.monthlyPercentBaseload.find(item => item.monthNum === month);
      if (entry) entry.percent = amount;
    }, false, amount !== undefined);
  }

  addAdjustment(kind: 'dataAdjustments' | 'baselineAdjustmentsV2', event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value);
    if (!year) return;
    this.updateGroup(group => {
      if (!group[kind].some(item => item.year === year)) group[kind].push({ year, amount: 0 });
      group[kind].sort((first, second) => first.year - second.year);
    }, true);
    (event.target as HTMLSelectElement).value = '';
  }

  setAdjustment(kind: 'dataAdjustments' | 'baselineAdjustmentsV2', year: number, event: Event): void {
    const amount = numericValue(event);
    this.updateGroup(group => {
      const adjustment = group[kind].find(item => item.year === year);
      if (adjustment) adjustment.amount = amount ?? 0;
    });
  }

  removeAdjustment(kind: 'dataAdjustments' | 'baselineAdjustmentsV2', year: number): void {
    this.updateGroup(group => { group[kind] = group[kind].filter(item => item.year !== year); }, true);
  }

  setApplyBanking(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.updateGroup(group => {
      group.applyBanking = checked;
      if (!checked) { group.bankedAnalysisYear = undefined; group.newBaselineYear = undefined; }
    }, true);
  }

  setBankingYear(field: 'bankedAnalysisYear' | 'newBaselineYear', event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value) || undefined;
    this.updateGroup(group => { group[field] = year; }, true, !!year);
  }

  private applyAnalysisType(type: AnalysisType): void {
    this.updateGroup(group => {
      clearGroupModels(group);
      group.analysisType = type;
      if (type !== 'regression') group.predictorVariables.forEach(variable => {
        if (!variable.production) variable.productionInAnalysis = false;
      });
    }, true);
  }

  private togglePredictor(predictorId: string): void {
    this.updateGroup(group => {
      clearGroupModels(group);
      const variable = group.predictorVariables.find(item => item.id === predictorId);
      if (variable) variable.productionInAnalysis = !variable.productionInAnalysis;
    }, true);
  }

  private updateGroup(
    update: (group: NonNullable<ReturnType<FacilityAnalysisGroupSetupComponent['group']>>) => void,
    immediate = false,
    valid = true
  ): void {
    const groupGuid = this.groupContext.groupGuid();
    this.autosave.update(draft => {
      const group = draft.groups.find(item => item.idbGroupId === groupGuid);
      if (group) update(group);
      draft.isAnalysisVisited = false;
    }, { immediate, valid });
  }
}

export function clearGroupModels(group: NonNullable<ReturnType<FacilityAnalysisGroupSetupComponent['group']>>): void {
  group.models = undefined;
  group.selectedModelId = undefined;
  group.dateModelsGenerated = undefined;
  group.regressionModelYear = undefined;
  group.regressionConstant = undefined;
  group.predictorVariables.forEach(variable => { variable.regressionCoefficient = undefined; });
}

function numericValue(event: Event): number | undefined {
  const raw = (event.target as HTMLInputElement).value;
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

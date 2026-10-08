import { Injectable, WritableSignal, computed, inject, signal } from '@angular/core';
import { AnalysisGroup, AnalysisType } from '@data/models/analysis';
import { buildMeterCards } from '@app/v1/facility/data/meters/models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { isSkippedAnalysisType } from '../../facility-analysis-workbench.models';
import { invalidateRegressionModel } from '../regression/regression-draft';
import { FacilityAnalysisPeriodService } from '../../analysis-setup/facility-analysis-period.service';
import { evaluateBankedGroupConfiguration } from '@shared/shared-analysis/banking-configuration';
import { bankingSourceHasBlockingErrors } from '../../banking/facility-analysis-banking';

/** Owns group-setup derived state and draft mutations; the component owns view interaction. */
@Injectable()
export class FacilityAnalysisGroupSetupFacade {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly workbench = this.groupContext.workbench;
  readonly autosave = this.groupContext.autosave;
  private readonly period = inject(FacilityAnalysisPeriodService);
  readonly group = this.groupContext.group;
  readonly analysis = this.autosave.draft;
  readonly dataAdjustmentDraft = signal<AdjustmentDraft>({ amount: '' });
  readonly baselineAdjustmentDraft = signal<AdjustmentDraft>({ amount: '' });
  readonly dataAdjustmentEditorOpen = signal(false);
  readonly baselineAdjustmentEditorOpen = signal(false);
  readonly hasModels = computed(() => (this.group()?.models?.length ?? 0) > 0);
  readonly missingMeters = computed(() => this.groupContext.meters().length === 0);
  readonly meterStatusItems = computed(() => {
    const facility = this.workbench.facility();
    if (!facility) return [];
    return buildMeterCards(
      this.groupContext.meters(),
      this.workbench.workspace.facilityMeterData(),
      this.workbench.meterGroups(),
      this.workbench.status.items(),
      facility,
      [],
      this.workbench.status.state() === 'ready'
    ).map(card => ({
      ...card,
      route: this.navigation.facilityMeterRoute(facility.guid, card.meter.guid, 'settings'),
      issueSummary: card.statusIssueLabels?.slice(0, 2).join(', ')
    }));
  });
  readonly productionVariables = computed(() => this.group()?.predictorVariables.filter(variable => variable.production) ?? []);
  readonly selectedProductionCount = computed(() => this.productionVariables().filter(variable => variable.productionInAnalysis).length);
  readonly isSkipped = computed(() => !!this.group() && isSkippedAnalysisType(this.group()!.analysisType));
  readonly adjustmentYears = computed(() => {
    const baseline = this.analysis()?.baselineYear;
    if (!baseline) return [];
    return Array.from({ length: Math.max(new Date().getFullYear() - baseline + 1, 1) }, (_, index) => baseline + index);
  });
  readonly latestCompleteYears = computed(() => this.period.bankingLatestCompleteYears(this.groupContext.groupGuid()));
  readonly bankingConfiguration = computed(() => evaluateBankedGroupConfiguration(
    this.analysis(), this.group(), this.workbench.analyses(), this.latestCompleteYears()
  ));
  readonly bankingSource = computed(() => this.bankingConfiguration().source);
  readonly bankedGroup = computed(() => this.bankingConfiguration().sourceGroup);
  readonly bankingYears = computed(() => this.bankingConfiguration());
  readonly bankingUnavailableReason = computed(() => {
    const configuration = this.bankingConfiguration();
    if (configuration.issue || !configuration.source) return 'Select a valid banking source in Analysis Setup.';
    if (bankingSourceHasBlockingErrors(this.analysis(), configuration.source, this.workbench.status.items())) {
      return 'Resolve the selected banking source errors before applying banking.';
    }
    if (!configuration.sourceGroup) return 'The banking source does not contain a usable matching meter group.';
    if (configuration.groupIssue === 'data-unavailable') {
      return 'This group or its banking source does not have a complete year of required meter and predictor data.';
    }
    return undefined;
  });
  readonly bankingModelYearWarning = computed(() => {
    const group = this.group();
    const sourceGroup = this.bankedGroup();
    return group?.applyBanking && sourceGroup?.analysisType === 'regression'
      && Number.isFinite(sourceGroup.regressionModelYear) && Number.isFinite(group.bankedAnalysisYear)
      && sourceGroup.regressionModelYear > group.bankedAnalysisYear
      ? `The source model year (${sourceGroup.regressionModelYear}) is after the applied banking year (${group.bankedAnalysisYear}). Review the source model before relying on these results.`
      : undefined;
  });
  readonly availableDataAdjustmentYears = computed(() => {
    const used = new Set(this.group()?.dataAdjustments.map(item => item.year) ?? []);
    return this.adjustmentYears().filter(year => !used.has(year));
  });
  readonly availableBaselineAdjustmentYears = computed(() => {
    const used = new Set(this.group()?.baselineAdjustmentsV2.map(item => item.year) ?? []);
    return this.adjustmentYears().filter(year => !used.has(year));
  });
  readonly adjustmentUnit = computed(() => {
    const analysis = this.analysis();
    if (!analysis) return '';
    return `${analysis.analysisCategory === 'water' ? analysis.waterUnit : analysis.energyUnit}/yr`;
  });
  readonly canAddDataAdjustment = computed(() => validAdjustmentDraft(this.dataAdjustmentDraft()));
  readonly canAddBaselineAdjustment = computed(() => validAdjustmentDraft(this.baselineAdjustmentDraft()));
  readonly bankingYearError = computed(() => {
    const group = this.group();
    if (!group?.applyBanking) return undefined;
    switch (this.bankingConfiguration().groupIssue) {
      case 'years-missing': return 'Select both the applied banking year and the new baseline year.';
      case 'applied-year-out-of-range': return 'Select an applied banking year supported by the source and complete group data.';
      case 'baseline-year-out-of-range': return 'Select a new baseline year supported by the current analysis and complete group data.';
      case 'year-order': return 'The new baseline year must be after the applied banking year.';
      default: return undefined;
    }
  });

  changeAnalysisType(type: AnalysisType): void {
    this.updateGroup(group => {
      invalidateRegressionModel(group);
      group.analysisType = type;
      if (type !== 'regression') group.predictorVariables.forEach(variable => {
        if (!variable.production) variable.productionInAnalysis = false;
      });
    }, true);
  }

  setPredictorSelected(predictorId: string, selected: boolean): void {
    this.updateGroup(group => {
      invalidateRegressionModel(group);
      const variable = group.predictorVariables.find(item => item.id === predictorId);
      if (variable) variable.productionInAnalysis = selected;
    }, true);
  }

  setLegacyBaseloadMode(monthly: boolean): void {
    this.updateGroup(group => { group.specifiedMonthlyPercentBaseload = monthly; }, true);
  }

  setAverageBaseload(amount: number | undefined): void {
    this.updateGroup(group => { group.averagePercentBaseload = amount; });
  }

  setMonthlyBaseload(month: number, amount: number | undefined): void {
    this.updateGroup(group => {
      const entry = group.monthlyPercentBaseload.find(item => item.monthNum === month);
      if (entry) entry.percent = amount;
    });
  }

  setAdjustmentYear(kind: AdjustmentKind, year: number | undefined): void {
    this.adjustmentDraft(kind).update(draft => ({ ...draft, year }));
  }

  setAdjustmentAmount(kind: AdjustmentKind, amount: string): void {
    this.adjustmentDraft(kind).update(draft => ({ ...draft, amount }));
  }

  openAdjustmentEditor(kind: AdjustmentKind): void {
    this.adjustmentDraft(kind).set({ amount: '' });
    this.adjustmentEditorOpen(kind).set(true);
  }

  cancelAdjustmentEditor(kind: AdjustmentKind): void {
    this.adjustmentDraft(kind).set({ amount: '' });
    this.adjustmentEditorOpen(kind).set(false);
  }

  addAdjustment(kind: AdjustmentKind): void {
    const draft = this.adjustmentDraft(kind)();
    const amount = Number(draft.amount);
    if (!draft.year || !Number.isFinite(amount) || amount <= 0) return;
    this.updateGroup(group => {
      if (!group[kind].some(item => item.year === draft.year)) group[kind].push({ year: draft.year!, amount });
      group[kind].sort((first, second) => first.year - second.year);
    }, true);
    this.cancelAdjustmentEditor(kind);
  }

  setAdjustment(kind: AdjustmentKind, year: number, amount: number | undefined): void {
    this.updateGroup(group => {
      const adjustment = group[kind].find(item => item.year === year);
      if (adjustment) adjustment.amount = amount ?? 0;
    });
  }

  removeAdjustment(kind: AdjustmentKind, year: number): void {
    this.updateGroup(group => { group[kind] = group[kind].filter(item => item.year !== year); }, true);
  }

  setApplyBanking(checked: boolean): void {
    if (checked && this.bankingUnavailableReason()) return;
    this.updateGroup(group => {
      group.applyBanking = checked;
      if (!checked) {
        group.bankedAnalysisYear = undefined;
        group.newBaselineYear = undefined;
      }
    }, true);
  }

  setBankingYear(field: 'bankedAnalysisYear' | 'newBaselineYear', year: number | undefined): void {
    this.updateGroup(group => { group[field] = year; }, true);
  }

  clearModels(): void {
    this.updateGroup(group => { invalidateRegressionModel(group); }, true);
  }

  private adjustmentDraft(kind: AdjustmentKind): WritableSignal<AdjustmentDraft> {
    return kind === 'dataAdjustments' ? this.dataAdjustmentDraft : this.baselineAdjustmentDraft;
  }

  private adjustmentEditorOpen(kind: AdjustmentKind): WritableSignal<boolean> {
    return kind === 'dataAdjustments' ? this.dataAdjustmentEditorOpen : this.baselineAdjustmentEditorOpen;
  }

  private updateGroup(update: (group: AnalysisGroup) => void, immediate = false): void {
    const groupGuid = this.groupContext.groupGuid();
    this.autosave.update(draft => {
      const group = draft.groups.find(item => item.idbGroupId === groupGuid);
      if (group) update(group);
      draft.isAnalysisVisited = false;
    }, {
      immediate,
      valid: draft => {
        const group = draft.groups.find(item => item.idbGroupId === groupGuid);
        const evaluation = evaluateBankedGroupConfiguration(
          draft, group, this.workbench.analyses(), this.latestCompleteYears()
        );
        return !!group && groupSetupDraftValid(group, draft.hasBanking, evaluation.valid)
          && (!evaluation.source || !bankingSourceHasBlockingErrors(draft, evaluation.source, this.workbench.status.items()));
      }
    });
  }
}

export type AdjustmentKind = 'dataAdjustments' | 'baselineAdjustmentsV2';

export interface AdjustmentDraft {
  readonly year?: number;
  readonly amount: string;
}

function validAdjustmentDraft(draft: AdjustmentDraft): boolean {
  const amount = Number(draft.amount);
  return !!draft.year && draft.amount.trim().length > 0 && Number.isFinite(amount) && amount > 0;
}

export function groupSetupDraftValid(
  group: AnalysisGroup,
  analysisHasBanking: boolean,
  bankingConfigurationValid = true
): boolean {
  if (isSkippedAnalysisType(group.analysisType)) return true;
  if ((group.analysisType === 'energyIntensity' || group.analysisType === 'modifiedEnergyIntensity')
    && !group.predictorVariables.some(variable => variable.productionInAnalysis)) return false;
  if (group.analysisType === 'modifiedEnergyIntensity') {
    if (group.specifiedMonthlyPercentBaseload) {
      if (group.monthlyPercentBaseload.length !== 12
        || group.monthlyPercentBaseload.some(item => !Number.isFinite(item.percent))) return false;
    } else if (!Number.isFinite(group.averagePercentBaseload)) return false;
  }
  if (analysisHasBanking && group.applyBanking) {
    if (!Number.isFinite(group.bankedAnalysisYear) || !Number.isFinite(group.newBaselineYear)) return false;
    if (group.bankedAnalysisYear >= group.newBaselineYear) return false;
    if (!bankingConfigurationValid) return false;
  }
  return [...(group.dataAdjustments ?? []), ...(group.baselineAdjustmentsV2 ?? [])]
    .every(adjustment => Number.isFinite(adjustment.year) && Number.isFinite(adjustment.amount) && adjustment.amount >= 0);
}

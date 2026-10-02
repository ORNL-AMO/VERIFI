import { Injectable, WritableSignal, computed, inject, signal } from '@angular/core';
import { AnalysisGroup, AnalysisType } from '@data/models/analysis';
import { buildMeterCards } from '@app/v1/facility/data/meters/models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { isSkippedAnalysisType } from '../../facility-analysis-workbench.models';
import { invalidateRegressionModel } from '../regression/regression-draft';

/** Owns group-setup derived state and draft mutations; the component owns view interaction. */
@Injectable()
export class FacilityAnalysisGroupSetupFacade {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly workbench = this.groupContext.workbench;
  readonly autosave = this.groupContext.autosave;
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
    if (!group.bankedAnalysisYear || !group.newBaselineYear) return 'Select both the applied banking year and the new baseline year.';
    return group.newBaselineYear <= group.bankedAnalysisYear ? 'The new baseline year must be after the applied banking year.' : undefined;
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

  togglePredictor(predictorId: string): void {
    this.updateGroup(group => {
      invalidateRegressionModel(group);
      const variable = group.predictorVariables.find(item => item.id === predictorId);
      if (variable) variable.productionInAnalysis = !variable.productionInAnalysis;
    }, true);
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

  setAdjustmentYear(kind: AdjustmentKind, event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value) || undefined;
    this.adjustmentDraft(kind).update(draft => ({ ...draft, year }));
  }

  setAdjustmentAmount(kind: AdjustmentKind, event: Event): void {
    const amount = (event.target as HTMLInputElement).value;
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

  setAdjustment(kind: AdjustmentKind, year: number, event: Event): void {
    const amount = numericValue(event);
    this.updateGroup(group => {
      const adjustment = group[kind].find(item => item.year === year);
      if (adjustment) adjustment.amount = amount ?? 0;
    });
  }

  removeAdjustment(kind: AdjustmentKind, year: number): void {
    this.updateGroup(group => { group[kind] = group[kind].filter(item => item.year !== year); }, true);
  }

  setApplyBanking(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.updateGroup(group => {
      group.applyBanking = checked;
      if (!checked) {
        group.bankedAnalysisYear = undefined;
        group.newBaselineYear = undefined;
      }
    }, true);
  }

  setBankingYear(field: 'bankedAnalysisYear' | 'newBaselineYear', event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value) || undefined;
    this.updateGroup(group => { group[field] = year; }, true, !!year);
  }

  private adjustmentDraft(kind: AdjustmentKind): WritableSignal<AdjustmentDraft> {
    return kind === 'dataAdjustments' ? this.dataAdjustmentDraft : this.baselineAdjustmentDraft;
  }

  private adjustmentEditorOpen(kind: AdjustmentKind): WritableSignal<boolean> {
    return kind === 'dataAdjustments' ? this.dataAdjustmentEditorOpen : this.baselineAdjustmentEditorOpen;
  }

  private updateGroup(update: (group: AnalysisGroup) => void, immediate = false, valid = true): void {
    const groupGuid = this.groupContext.groupGuid();
    this.autosave.update(draft => {
      const group = draft.groups.find(item => item.idbGroupId === groupGuid);
      if (group) update(group);
      draft.isAnalysisVisited = false;
    }, { immediate, valid });
  }
}

export type AdjustmentKind = 'dataAdjustments' | 'baselineAdjustmentsV2';

export interface AdjustmentDraft {
  readonly year?: number;
  readonly amount: string;
}

function numericValue(event: Event): number | undefined {
  const raw = (event.target as HTMLInputElement).value;
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function validAdjustmentDraft(draft: AdjustmentDraft): boolean {
  const amount = Number(draft.amount);
  return !!draft.year && draft.amount.trim().length > 0 && Number.isFinite(amount) && amount > 0;
}

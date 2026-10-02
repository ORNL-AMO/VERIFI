import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs';
import { AnalysisType } from '@data/models/analysis';
import { AdjustmentKind, FacilityAnalysisGroupSetupFacade } from './facility-analysis-group-setup.facade';

export type GroupSetupPendingChange =
  | { readonly kind: 'analysisType'; readonly value: AnalysisType }
  | { readonly kind: 'predictor'; readonly predictorId: string; readonly selected: boolean };

@Injectable()
export class FacilityAnalysisGroupSetupController {
  readonly setup = inject(FacilityAnalysisGroupSetupFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly predictorControls = new Map<string, FormControl<boolean>>();
  private readonly monthlyBaseloadControls = new Map<number, FormControl<number | null>>();
  private readonly adjustmentControls = new Map<string, FormControl<number | null>>();
  private syncing = false;

  readonly analysisType = new FormControl<AnalysisType>('absoluteEnergyConsumption', { nonNullable: true });
  readonly baseloadMode = new FormControl<'average' | 'monthly'>('average', { nonNullable: true });
  readonly averageBaseload = new FormControl<number | null>(null);
  readonly dataAdjustmentYear = new FormControl<number | null>(null);
  readonly dataAdjustmentAmount = new FormControl<number | null>(null);
  readonly baselineAdjustmentYear = new FormControl<number | null>(null);
  readonly baselineAdjustmentAmount = new FormControl<number | null>(null);
  readonly applyBanking = new FormControl(false, { nonNullable: true });
  readonly bankedAnalysisYear = new FormControl<number | null>(null);
  readonly newBaselineYear = new FormControl<number | null>(null);
  readonly pendingChange = signal<GroupSetupPendingChange | undefined>(undefined);

  constructor() {
    effect(() => this.syncFromGroup());
    this.analysisType.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      if (this.syncing || value === this.setup.group()?.analysisType) return;
      if (this.setup.hasModels()) { this.pendingChange.set({ kind: 'analysisType', value }); this.syncFromGroup(); }
      else this.setup.changeAnalysisType(value);
    });
    this.baseloadMode.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => { if (!this.syncing) this.setup.setLegacyBaseloadMode(value === 'monthly'); });
    this.averageBaseload.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => { if (!this.syncing) this.setup.setAverageBaseload(value ?? undefined); });
    this.applyBanking.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => { if (!this.syncing) this.setup.setApplyBanking(value); });
    this.bankedAnalysisYear.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => { if (!this.syncing) this.setup.setBankingYear('bankedAnalysisYear', value ?? undefined); });
    this.newBaselineYear.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => { if (!this.syncing) this.setup.setBankingYear('newBaselineYear', value ?? undefined); });
  }

  predictorControl(id: string): FormControl<boolean> {
    let control = this.predictorControls.get(id);
    if (!control) {
      control = new FormControl(false, { nonNullable: true });
      control.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(selected => {
        if (this.syncing) return;
        if (this.setup.hasModels()) { this.pendingChange.set({ kind: 'predictor', predictorId: id, selected }); this.syncFromGroup(); }
        else this.setup.setPredictorSelected(id, selected);
      });
      this.predictorControls.set(id, control);
    }
    return control;
  }

  monthlyBaseloadControl(month: number): FormControl<number | null> {
    let control = this.monthlyBaseloadControls.get(month);
    if (!control) {
      control = new FormControl<number | null>(null);
      control.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
        .subscribe(value => { if (!this.syncing) this.setup.setMonthlyBaseload(month, value ?? undefined); });
      this.monthlyBaseloadControls.set(month, control);
    }
    return control;
  }

  adjustmentControl(kind: AdjustmentKind, year: number): FormControl<number | null> {
    const key = `${kind}:${year}`;
    let control = this.adjustmentControls.get(key);
    if (!control) {
      control = new FormControl<number | null>(null);
      control.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
        .subscribe(value => { if (!this.syncing) this.setup.setAdjustment(kind, year, value ?? undefined); });
      this.adjustmentControls.set(key, control);
    }
    return control;
  }

  confirmPendingChange(): void {
    const pending = this.pendingChange();
    this.pendingChange.set(undefined);
    if (pending?.kind === 'analysisType') this.setup.changeAnalysisType(pending.value);
    if (pending?.kind === 'predictor') this.setup.setPredictorSelected(pending.predictorId, pending.selected);
  }

  cancelPendingChange(): void { this.pendingChange.set(undefined); this.syncFromGroup(); }

  openAdjustmentEditor(kind: AdjustmentKind): void {
    this.setup.openAdjustmentEditor(kind);
    this.adjustmentYearControl(kind).setValue(null, { emitEvent: false });
    this.adjustmentAmountControl(kind).setValue(null, { emitEvent: false });
  }

  cancelAdjustmentEditor(kind: AdjustmentKind): void { this.setup.cancelAdjustmentEditor(kind); }

  addAdjustment(kind: AdjustmentKind): void {
    const year = this.adjustmentYearControl(kind).value;
    const amount = this.adjustmentAmountControl(kind).value;
    this.setup.setAdjustmentYear(kind, year ?? undefined);
    this.setup.setAdjustmentAmount(kind, amount == null ? '' : String(amount));
    this.setup.addAdjustment(kind);
  }

  adjustmentYearControl(kind: AdjustmentKind): FormControl<number | null> {
    return kind === 'dataAdjustments' ? this.dataAdjustmentYear : this.baselineAdjustmentYear;
  }

  adjustmentAmountControl(kind: AdjustmentKind): FormControl<number | null> {
    return kind === 'dataAdjustments' ? this.dataAdjustmentAmount : this.baselineAdjustmentAmount;
  }

  private syncFromGroup(): void {
    const group = this.setup.group();
    if (!group) return;
    this.syncing = true;
    this.analysisType.setValue(group.analysisType, { emitEvent: false });
    this.baseloadMode.setValue(group.specifiedMonthlyPercentBaseload ? 'monthly' : 'average', { emitEvent: false });
    this.averageBaseload.setValue(group.averagePercentBaseload ?? null, { emitEvent: false });
    this.applyBanking.setValue(!!group.applyBanking, { emitEvent: false });
    this.bankedAnalysisYear.setValue(group.bankedAnalysisYear ?? null, { emitEvent: false });
    this.newBaselineYear.setValue(group.newBaselineYear ?? null, { emitEvent: false });
    for (const predictor of group.predictorVariables) this.predictorControl(predictor.id).setValue(!!predictor.productionInAnalysis, { emitEvent: false });
    for (const entry of group.monthlyPercentBaseload) this.monthlyBaseloadControl(entry.monthNum).setValue(entry.percent ?? null, { emitEvent: false });
    for (const kind of ['dataAdjustments', 'baselineAdjustmentsV2'] as const) {
      for (const entry of group[kind]) this.adjustmentControl(kind, entry.year).setValue(entry.amount, { emitEvent: false });
    }
    const locked = this.setup.hasModels();
    for (const control of [this.applyBanking, this.bankedAnalysisYear, this.newBaselineYear]) {
      locked ? control.disable({ emitEvent: false }) : control.enable({ emitEvent: false });
    }
    this.syncing = false;
  }
}

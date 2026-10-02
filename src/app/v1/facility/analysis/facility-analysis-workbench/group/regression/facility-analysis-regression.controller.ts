import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs';
import { JStatRegressionModel } from '@data/models/analysis';
import { FacilityAnalysisRegressionFacade } from './facility-analysis-regression.facade';

export type RegressionRangeField = 'regressionModelStartMonth' | 'regressionStartYear' | 'regressionModelEndMonth' | 'regressionEndYear';
export type RegressionMethod = 'generated' | 'userDefined';
export type RegressionPendingChange =
  | { readonly kind: 'method'; readonly value: RegressionMethod }
  | { readonly kind: 'predictor'; readonly predictorId: string; readonly selected: boolean }
  | { readonly kind: 'maxVariables'; readonly value: number };

@Injectable()
export class FacilityAnalysisRegressionController {
  readonly workflow = inject(FacilityAnalysisRegressionFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly predictorControls = new Map<string, FormControl<boolean>>();
  private readonly coefficientControls = new Map<string, FormControl<number | null>>();
  private syncing = false;
  private reviewTrigger: HTMLElement | undefined;

  readonly method = new FormControl<RegressionMethod>('generated', { nonNullable: true });
  readonly maxVariables = new FormControl<number | null>(null);
  readonly constant = new FormControl<number | null>(null);
  readonly startMonth = new FormControl<number | null>(null);
  readonly startYear = new FormControl<number | null>(null);
  readonly endMonth = new FormControl<number | null>(null);
  readonly endYear = new FormControl<number | null>(null);
  readonly notes = new FormControl('', { nonNullable: true });
  readonly modelYearFilter = new FormControl<number | 'all'>('all', { nonNullable: true });
  readonly showInvalid = new FormControl(false, { nonNullable: true });
  readonly showFailedValidation = new FormControl(false, { nonNullable: true });
  readonly modelYearFilterValue = toSignal(this.modelYearFilter.valueChanges, { initialValue: this.modelYearFilter.value });
  readonly showInvalidValue = toSignal(this.showInvalid.valueChanges, { initialValue: false });
  readonly showFailedValidationValue = toSignal(this.showFailedValidation.valueChanges, { initialValue: false });
  readonly pendingChange = signal<RegressionPendingChange | undefined>(undefined);

  constructor() {
    effect(() => this.syncFromGroup());
    this.method.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      if (this.syncing) return;
      const group = this.workflow.group();
      if (!group || group.isGeneratedModel === (value === 'generated')) return;
      if (group.selectedModelId || this.workflow.generatedModels().length) {
        this.pendingChange.set({ kind: 'method', value });
        this.syncFromGroup();
      } else this.workflow.changeMethod(value === 'generated');
    });
    this.maxVariables.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      if (this.syncing || value == null) return;
      const group = this.workflow.group();
      if (!group || value === group.maxModelVariables) return;
      if (group.selectedModelId || this.workflow.generatedModels().length) {
        this.pendingChange.set({ kind: 'maxVariables', value });
        this.syncFromGroup();
      } else this.workflow.changeMaxVariables(value);
    });
    this.constant.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => { if (!this.syncing) this.workflow.setConstant(value ?? undefined); });
    this.bindRange(this.startMonth, 'regressionModelStartMonth');
    this.bindRange(this.startYear, 'regressionStartYear');
    this.bindRange(this.endMonth, 'regressionModelEndMonth');
    this.bindRange(this.endYear, 'regressionEndYear');
    this.notes.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => { if (!this.syncing) this.workflow.setNotes(value); });
  }

  predictorControl(predictorId: string): FormControl<boolean> {
    let control = this.predictorControls.get(predictorId);
    if (!control) {
      control = new FormControl(false, { nonNullable: true });
      control.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(selected => {
        if (this.syncing) return;
        const group = this.workflow.group();
        if (!group) return;
        if (group.isGeneratedModel && (group.selectedModelId || this.workflow.generatedModels().length)) {
          this.pendingChange.set({ kind: 'predictor', predictorId, selected });
          this.syncFromGroup();
        } else this.workflow.setPredictorSelected(predictorId, selected);
      });
      this.predictorControls.set(predictorId, control);
    }
    return control;
  }

  coefficientControl(predictorId: string): FormControl<number | null> {
    let control = this.coefficientControls.get(predictorId);
    if (!control) {
      control = new FormControl<number | null>(null);
      control.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(value => {
        if (!this.syncing) this.workflow.setCoefficient(predictorId, value ?? undefined);
      });
      this.coefficientControls.set(predictorId, control);
    }
    return control;
  }

  confirmPendingChange(): void {
    const pending = this.pendingChange();
    this.pendingChange.set(undefined);
    if (!pending) return;
    if (pending.kind === 'method') this.workflow.changeMethod(pending.value === 'generated');
    if (pending.kind === 'predictor') this.workflow.setPredictorSelected(pending.predictorId, pending.selected);
    if (pending.kind === 'maxVariables') this.workflow.changeMaxVariables(pending.value);
  }

  cancelPendingChange(): void { this.pendingChange.set(undefined); this.syncFromGroup(); }

  openReview(model: JStatRegressionModel, trigger: HTMLElement): void {
    this.reviewTrigger = trigger;
    this.workflow.inspectModel(model);
  }

  closeReview(): void {
    this.workflow.clearReview();
    const trigger = this.reviewTrigger;
    this.reviewTrigger = undefined;
    if (trigger) queueMicrotask(() => trigger.focus());
  }

  selectModel(model: JStatRegressionModel): void { this.workflow.selectModel(model); this.closeReview(); }

  private bindRange(control: FormControl<number | null>, field: RegressionRangeField): void {
    control.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => { if (!this.syncing) this.workflow.setRange(field, value ?? undefined); });
  }

  private syncFromGroup(): void {
    const group = this.workflow.group();
    if (!group) return;
    this.syncing = true;
    this.method.setValue(group.isGeneratedModel ? 'generated' : 'userDefined', { emitEvent: false });
    this.maxVariables.setValue(group.maxModelVariables ?? null, { emitEvent: false });
    this.constant.setValue(group.regressionConstant ?? null, { emitEvent: false });
    this.startMonth.setValue(group.regressionModelStartMonth ?? null, { emitEvent: false });
    this.startYear.setValue(group.regressionStartYear ?? null, { emitEvent: false });
    this.endMonth.setValue(group.regressionModelEndMonth ?? null, { emitEvent: false });
    this.endYear.setValue(group.regressionEndYear ?? null, { emitEvent: false });
    this.notes.setValue(group.regressionModelNotes ?? '', { emitEvent: false });
    for (const predictor of group.predictorVariables) {
      const selected = this.predictorControl(predictor.id);
      selected.setValue(!!predictor.productionInAnalysis, { emitEvent: false });
      const coefficient = this.coefficientControl(predictor.id);
      coefficient.setValue(predictor.regressionCoefficient ?? null, { emitEvent: false });
      predictor.productionInAnalysis ? coefficient.enable({ emitEvent: false }) : coefficient.disable({ emitEvent: false });
    }
    this.syncing = false;
  }
}

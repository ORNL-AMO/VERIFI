import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { EnergyUnitOptions, VolumeLiquidOptions } from '@shared/unitOptions';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';
import { AccountAnalysisPeriodService } from './account-analysis-period.service';
import {
  AccountAnalysisSetupActionsService,
  BulkFacilityAnalysisType
} from './account-analysis-setup-actions.service';

@Component({
  selector: 'app-account-analysis-setup',
  standalone: true,
  providers: [AccountAnalysisPeriodService, AccountAnalysisSetupActionsService],
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ConfirmationDialogComponent],
  templateUrl: './account-analysis-setup.component.html',
  styleUrls: ['./account-analysis-setup.component.css']
})
export class AccountAnalysisSetupComponent implements OnDestroy {
  @ViewChild('clearSelectionsModal', { static: true }) private clearSelectionsModal!: TemplateRef<unknown>;
  @ViewChild('bulkCreateModal', { static: true }) private bulkCreateModal!: TemplateRef<unknown>;

  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly autosave = inject(AccountAnalysisAutosaveService);
  readonly period = inject(AccountAnalysisPeriodService);
  readonly actions = inject(AccountAnalysisSetupActionsService);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly activeModal = signal<'clear' | 'bulk' | undefined>(undefined);
  readonly energyUnits = EnergyUnitOptions;
  readonly waterUnits = VolumeLiquidOptions;
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)]
    }),
    energyIsSource: new FormControl(false, { nonNullable: true }),
    energyUnit: new FormControl('', { nonNullable: true }),
    waterUnit: new FormControl('', { nonNullable: true }),
    baselineYear: new FormControl<number | null>(null, { validators: [Validators.required] })
  });
  readonly bulkAnalysisType = new FormControl<BulkFacilityAnalysisType>('absoluteEnergyConsumption', {
    nonNullable: true
  });
  readonly draft = this.autosave.draft;
  readonly hasSelections = computed(() => this.draft()?.facilityAnalysisItems
    .some(item => item.analysisItemId !== undefined) ?? false);
  readonly selectedFacilityCount = computed(() => this.draft()?.facilityAnalysisItems
    .filter(item => item.analysisItemId !== undefined).length ?? 0);
  readonly baselineGoalWarning = computed(() => {
    const analysis = this.draft();
    const account = this.context.account();
    if (!analysis || !account || !Number.isFinite(analysis.baselineYear)) return undefined;
    const questions = account.sustainabilityQuestions;
    const goal = analysis.analysisCategory === 'water'
      ? questions.waterReductionGoal
      : questions.energyReductionGoal;
    const goalYear = analysis.analysisCategory === 'water'
      ? questions.waterReductionBaselineYear
      : questions.energyReductionBaselineYear;
    return goal && goalYear !== analysis.baselineYear
      ? `This baseline does not match the account ${analysis.analysisCategory} goal baseline (${goalYear}). Goal reports cannot use this analysis until they match.`
      : undefined;
  });

  constructor() {
    effect(() => this.syncForm());
    const controls = this.form.controls;
    controls.name.valueChanges.pipe(takeUntilDestroyed()).subscribe(name => {
      this.updateAnalysis(draft => { draft.name = name; });
    });
    controls.energyIsSource.valueChanges.pipe(takeUntilDestroyed()).subscribe(energyIsSource => {
      if (this.hasSelections()) return;
      this.updateAnalysis(draft => { draft.energyIsSource = energyIsSource; }, true);
    });
    controls.energyUnit.valueChanges.pipe(takeUntilDestroyed()).subscribe(energyUnit => {
      if (this.hasSelections()) return;
      this.updateAnalysis(draft => { draft.energyUnit = energyUnit; }, true);
    });
    controls.waterUnit.valueChanges.pipe(takeUntilDestroyed()).subscribe(waterUnit => {
      if (this.hasSelections()) return;
      this.updateAnalysis(draft => { draft.waterUnit = waterUnit; }, true);
    });
    controls.baselineYear.valueChanges.pipe(takeUntilDestroyed()).subscribe(baselineYear => {
      if (this.hasSelections()) return;
      this.updateAnalysis(draft => { draft.baselineYear = baselineYear ?? Number.NaN; }, true);
    });
  }

  async requestClearSelections(): Promise<void> {
    if (!await this.autosave.flush()) return;
    this.actions.clearError();
    this.activeModal.set('clear');
    this.modalPortal.show(new TemplatePortal(this.clearSelectionsModal, this.viewContainerRef));
  }

  async confirmClearSelections(): Promise<void> {
    if (await this.actions.clearSelections()) this.closeModal();
  }

  async requestBulkCreate(): Promise<void> {
    if (!await this.autosave.flush()) return;
    this.actions.clearError();
    this.activeModal.set('bulk');
    this.modalPortal.show(new TemplatePortal(this.bulkCreateModal, this.viewContainerRef));
  }

  async confirmBulkCreate(): Promise<void> {
    if (await this.actions.createBulkFacilityAnalyses(this.bulkAnalysisType.value)) this.closeModal();
  }

  closeModal(): void {
    if (!this.activeModal()) return;
    this.activeModal.set(undefined);
    this.modalPortal.hide();
  }

  ngOnDestroy(): void {
    this.closeModal();
  }

  private updateAnalysis(update: (draft: IdbAccountAnalysisItem) => void, immediate = false): void {
    this.autosave.update(draft => {
      update(draft);
      draft.isAnalysisVisited = false;
    }, {
      immediate,
      valid: accountAnalysisSetupDraftValid
    });
  }

  private syncForm(): void {
    const analysis = this.draft();
    const locked = this.hasSelections();
    const baselineReady = this.period.state() === 'ready' && this.period.baselineYears().length > 0;
    if (!analysis) {
      this.form.disable({ emitEvent: false });
      return;
    }

    syncControlValue(this.form.controls.name, analysis.name);
    syncControlValue(this.form.controls.energyIsSource, analysis.energyIsSource);
    syncControlValue(this.form.controls.energyUnit, analysis.energyUnit);
    syncControlValue(this.form.controls.waterUnit, analysis.waterUnit);
    syncControlValue(
      this.form.controls.baselineYear,
      Number.isFinite(analysis.baselineYear) ? analysis.baselineYear : null,
      true
    );

    setControlDisabled(this.form.controls.name, false);
    setControlDisabled(this.form.controls.energyIsSource, locked);
    setControlDisabled(this.form.controls.energyUnit, locked);
    setControlDisabled(this.form.controls.waterUnit, locked);
    setControlDisabled(this.form.controls.baselineYear, locked || !baselineReady);
  }
}

export function accountAnalysisSetupDraftValid(analysis: IdbAccountAnalysisItem): boolean {
  return analysis.name.trim().length > 0 && Number.isFinite(analysis.baselineYear);
}

function setControlDisabled(control: AbstractControl, disabled: boolean): void {
  if (disabled && control.enabled) control.disable({ emitEvent: false });
  if (!disabled && control.disabled) control.enable({ emitEvent: false });
}

function syncControlValue<T>(control: FormControl<T>, value: T, force = false): void {
  if (force || !Object.is(control.value, value)) control.setValue(value, { emitEvent: false });
}

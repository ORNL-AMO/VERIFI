import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalysisType, JStatRegressionModel } from '@data/models/analysis';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AdjustmentKind, FacilityAnalysisGroupSetupFacade } from './facility-analysis-group-setup.facade';
import { FacilityAnalysisGroupSetupController } from './facility-analysis-group-setup.controller';
import { BankedGroupSavingsComponent } from './banked-group-savings/banked-group-savings.component';
import { buildFacilityAnalysisGroupModelView } from '../../../group-model-roster/facility-analysis-group-model.view';
import { RegressionModelReviewSlideoutComponent } from '../regression/model-review-slideout/regression-model-review-slideout.component';
import { RegressionModelValidationService } from '../regression/regression-model-validation.service';

@Component({
  selector: 'app-facility-analysis-group-setup',
  standalone: true,
  imports: [RouterLink, IconComponent, ConfirmationDialogComponent, ReactiveFormsModule, BankedGroupSavingsComponent, RegressionModelReviewSlideoutComponent],
  providers: [FacilityAnalysisGroupSetupFacade, FacilityAnalysisGroupSetupController, RegressionModelValidationService],
  templateUrl: './facility-analysis-group-setup.component.html',
  styleUrls: ['./facility-analysis-group-setup.component.css']
})
export class FacilityAnalysisGroupSetupComponent implements OnDestroy {
  @ViewChild('modelInputConfirmation', { static: true }) private modelInputConfirmation!: TemplateRef<unknown>;

  private readonly setup = inject(FacilityAnalysisGroupSetupFacade);
  readonly controller = inject(FacilityAnalysisGroupSetupController);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  readonly regressionValidation = inject(RegressionModelValidationService);
  private confirmationOpen = false;
  private regressionInspectionTrigger: HTMLElement | undefined;

  readonly navigation = this.setup.navigation;
  readonly workbench = this.setup.workbench;
  readonly group = this.setup.group;
  readonly analysis = this.setup.analysis;
  readonly dataAdjustmentDraft = this.setup.dataAdjustmentDraft;
  readonly baselineAdjustmentDraft = this.setup.baselineAdjustmentDraft;
  readonly dataAdjustmentEditorOpen = this.setup.dataAdjustmentEditorOpen;
  readonly baselineAdjustmentEditorOpen = this.setup.baselineAdjustmentEditorOpen;
  readonly hasModels = this.setup.hasModels;
  readonly missingMeters = this.setup.missingMeters;
  readonly meterStatusItems = this.setup.meterStatusItems;
  readonly productionVariables = this.setup.productionVariables;
  readonly selectedProductionCount = this.setup.selectedProductionCount;
  readonly isSkipped = this.setup.isSkipped;
  readonly adjustmentYears = this.setup.adjustmentYears;
  readonly availableDataAdjustmentYears = this.setup.availableDataAdjustmentYears;
  readonly availableBaselineAdjustmentYears = this.setup.availableBaselineAdjustmentYears;
  readonly adjustmentUnit = this.setup.adjustmentUnit;
  readonly canAddDataAdjustment = this.setup.canAddDataAdjustment;
  readonly canAddBaselineAdjustment = this.setup.canAddBaselineAdjustment;
  readonly bankingYearError = this.setup.bankingYearError;
  readonly bankingYears = this.setup.bankingYears;
  readonly bankingSource = this.setup.bankingSource;
  readonly bankedGroup = this.setup.bankedGroup;
  readonly bankingUnavailableReason = this.setup.bankingUnavailableReason;
  readonly bankingModelYearWarning = this.setup.bankingModelYearWarning;
  readonly selectedRegressionModel = computed(() => {
    const group = this.group();
    if (group?.analysisType !== 'regression' || !group.isGeneratedModel) return undefined;
    return group.models?.find(model => model.modelId === group.selectedModelId);
  });
  readonly inspectedRegressionModel = signal<JStatRegressionModel | undefined>(undefined);
  readonly modeledEquation = computed(() => {
    const analysis = this.analysis();
    const group = this.group();
    if (!analysis || !group) return undefined;
    return buildFacilityAnalysisGroupModelView(
      group,
      '',
      analysis.analysisCategory,
      analysis.baselineYear
    ).equationLabel;
  });
  readonly regressionEquation = computed(() => {
    const analysis = this.analysis();
    const group = this.group();
    if (!analysis || group?.analysisType !== 'regression') return undefined;
    const selectedModel = this.selectedRegressionModel();
    if (group.isGeneratedModel && !selectedModel) {
      return { text: 'No model selected.', unavailable: true };
    }
    const view = buildFacilityAnalysisGroupModelView(
      group,
      '',
      analysis.analysisCategory,
      analysis.baselineYear
    );
    return { text: view.equationLabel, unavailable: view.unavailable };
  });
  constructor() { effect(() => this.controller.pendingChange() ? this.openConfirmation() : this.closeConfirmation()); }

  confirmPendingChange(): void { this.controller.confirmPendingChange(); }

  inspectRegressionModel(model: JStatRegressionModel, trigger: HTMLElement): void {
    const group = this.group();
    if (!group) return;
    this.regressionInspectionTrigger = trigger;
    this.inspectedRegressionModel.set(model);
    this.regressionValidation.inspectGenerated(group, model);
  }

  closeRegressionModelInspection(): void {
    this.inspectedRegressionModel.set(undefined);
    this.regressionValidation.clear();
    const trigger = this.regressionInspectionTrigger;
    this.regressionInspectionTrigger = undefined;
    if (trigger) queueMicrotask(() => trigger.focus());
  }

  requestClearModels(): void { this.controller.requestClearModels(); }

  cancelModelInputChange(): void {
    this.closeConfirmation();
  }

  openAdjustmentEditor(kind: AdjustmentKind): void { this.controller.openAdjustmentEditor(kind); }
  cancelAdjustmentEditor(kind: AdjustmentKind): void { this.controller.cancelAdjustmentEditor(kind); }
  addAdjustment(kind: AdjustmentKind): void { this.controller.addAdjustment(kind); }
  removeAdjustment(kind: AdjustmentKind, year: number): void { this.setup.removeAdjustment(kind, year); }

  ngOnDestroy(): void {
    this.closeConfirmation();
    this.inspectedRegressionModel.set(undefined);
    this.regressionValidation.clear();
  }

  private openConfirmation(): void {
    this.confirmationOpen = true;
    this.modalPortal.show(new TemplatePortal(this.modelInputConfirmation, this.viewContainerRef));
  }

  private closeConfirmation(): void {
    this.controller.cancelPendingChange();
    if (!this.confirmationOpen) return;
    this.confirmationOpen = false;
    this.modalPortal.hide();
  }
}

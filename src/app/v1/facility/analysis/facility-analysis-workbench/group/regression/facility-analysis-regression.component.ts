import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, inject, signal } from '@angular/core';
import { JStatRegressionModel } from '@data/models/analysis';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { GeneratedModelReviewRequest, GeneratedRegressionWorkflowComponent } from './generated-regression-workflow/generated-regression-workflow.component';
import { RegressionModelReviewSlideoutComponent } from './model-review-slideout/regression-model-review-slideout.component';
import { FacilityAnalysisRegressionFacade } from './facility-analysis-regression.facade';
import { RegressionModelValidationService } from './regression-model-validation.service';
import { RegressionRangeField, RegressionUserField, UserDefinedRegressionWorkflowComponent } from './user-defined-regression-workflow/user-defined-regression-workflow.component';

export { generatedConfigurationValid, modelRangeMonthCount } from './facility-analysis-regression.facade';

@Component({
  selector: 'app-facility-analysis-regression',
  standalone: true,
  imports: [
    IconComponent,
    ConfirmationDialogComponent,
    GeneratedRegressionWorkflowComponent,
    UserDefinedRegressionWorkflowComponent,
    RegressionModelReviewSlideoutComponent
  ],
  providers: [RegressionModelValidationService, FacilityAnalysisRegressionFacade],
  templateUrl: './facility-analysis-regression.component.html',
  styleUrls: ['./facility-analysis-regression.component.css']
})
export class FacilityAnalysisRegressionComponent implements OnDestroy {
  @ViewChild('confirmationModal', { static: true }) private confirmationModal!: TemplateRef<unknown>;

  private readonly workflow = inject(FacilityAnalysisRegressionFacade);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private reviewTrigger: HTMLElement | undefined;
  private confirmationModalOpen = false;

  readonly group = this.workflow.group;
  readonly analysis = this.workflow.analysis;
  readonly months = this.workflow.months;
  readonly validation = this.workflow.validation;
  readonly generating = this.workflow.generating;
  readonly generationError = this.workflow.generationError;
  readonly configurationExpanded = this.workflow.configurationExpanded;
  readonly generatedThisSession = this.workflow.generatedThisSession;
  readonly inspectedModel = this.workflow.inspectedModel;
  readonly recoveryNotice = this.workflow.recoveryNotice;
  readonly generatedModels = this.workflow.generatedModels;
  readonly selectedModel = this.workflow.selectedModel;
  readonly maxVariableOptions = this.workflow.maxVariableOptions;
  readonly yearOptions = this.workflow.yearOptions;
  readonly hasUserDefinedDataIssue = this.workflow.hasUserDefinedDataIssue;
  readonly reviewComparisonModel = this.workflow.reviewComparisonModel;
  readonly pendingMethod = signal<boolean | undefined>(undefined);
  readonly pendingPredictorId = signal<string | undefined>(undefined);
  readonly pendingMaxVariables = signal<number | undefined>(undefined);

  requestMethod(generated: boolean): void {
    const group = this.group();
    if (!group || this.generating() || group.isGeneratedModel === generated) return;
    if (group.selectedModelId || this.generatedModels().length) {
      this.pendingMethod.set(generated);
      this.openConfirmationModal();
      return;
    }
    this.workflow.changeMethod(generated);
  }

  confirmMethodChange(): void {
    const generated = this.pendingMethod();
    this.cancelPendingConfirmation();
    if (generated !== undefined) this.workflow.changeMethod(generated);
  }

  requestPredictorToggle(predictorId: string): void {
    const group = this.group();
    if (!group) return;
    if (group.isGeneratedModel && (group.selectedModelId || this.generatedModels().length)) {
      this.pendingPredictorId.set(predictorId);
      this.openConfirmationModal();
      return;
    }
    this.workflow.togglePredictor(predictorId);
  }

  confirmPredictorChange(): void {
    const predictorId = this.pendingPredictorId();
    this.cancelPendingConfirmation();
    if (predictorId) this.workflow.togglePredictor(predictorId);
  }

  requestMaxVariables(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    const group = this.group();
    if (!group || value === group.maxModelVariables) return;
    if (group.selectedModelId || this.generatedModels().length) {
      this.pendingMaxVariables.set(value);
      this.openConfirmationModal();
      return;
    }
    this.workflow.changeMaxVariables(value);
  }

  confirmMaxVariablesChange(): void {
    const value = this.pendingMaxVariables();
    this.cancelPendingConfirmation();
    if (value !== undefined) this.workflow.changeMaxVariables(value);
  }

  cancelPendingConfirmation(): void {
    this.pendingMethod.set(undefined);
    this.pendingPredictorId.set(undefined);
    this.pendingMaxVariables.set(undefined);
    this.closeConfirmationModal();
  }

  setRange(change: { field: RegressionRangeField; event: Event }): void {
    this.workflow.setRange(change.field, change.event);
  }

  setUserValue(change: { field: RegressionUserField; event: Event }): void {
    this.workflow.setUserValue(change.field, change.event);
  }

  setCoefficient(change: { predictorId: string; event: Event }): void {
    this.workflow.setCoefficient(change.predictorId, change.event);
  }

  async generateModels(): Promise<void> {
    await this.workflow.generateModels();
    queueMicrotask(() => document.getElementById('generated-models-heading')?.focus());
  }

  selectModel(model: JStatRegressionModel): void {
    this.workflow.selectModel(model);
    this.closeReview();
  }

  openReview(request: GeneratedModelReviewRequest): void {
    this.reviewTrigger = request.trigger;
    this.workflow.inspectModel(request.model);
  }

  closeReview(): void {
    this.workflow.clearReview();
    const trigger = this.reviewTrigger;
    this.reviewTrigger = undefined;
    if (trigger) queueMicrotask(() => trigger.focus());
  }

  ngOnDestroy(): void {
    this.closeConfirmationModal();
  }

  private openConfirmationModal(): void {
    this.confirmationModalOpen = true;
    this.modalPortal.show(new TemplatePortal(this.confirmationModal, this.viewContainerRef));
  }

  private closeConfirmationModal(): void {
    if (!this.confirmationModalOpen) return;
    this.confirmationModalOpen = false;
    this.modalPortal.hide();
  }
}

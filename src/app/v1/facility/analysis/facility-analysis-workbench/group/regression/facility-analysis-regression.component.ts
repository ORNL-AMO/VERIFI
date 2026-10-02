import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject } from '@angular/core';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { GeneratedRegressionWorkflowComponent } from './generated-regression-workflow/generated-regression-workflow.component';
import { RegressionModelReviewSlideoutComponent } from './model-review-slideout/regression-model-review-slideout.component';
import { FacilityAnalysisRegressionFacade } from './facility-analysis-regression.facade';
import { RegressionModelValidationService } from './regression-model-validation.service';
import { UserDefinedRegressionWorkflowComponent } from './user-defined-regression-workflow/user-defined-regression-workflow.component';
import { FacilityAnalysisRegressionController, RegressionMethod } from './facility-analysis-regression.controller';
import { modeledQuantityLabel } from './regression-labels';
import { RegressionMethodControlComponent } from './method-control/regression-method-control.component';

export { generatedConfigurationValid, modelRangeMonthCount } from './facility-analysis-regression.facade';

@Component({
  selector: 'app-facility-analysis-regression',
  standalone: true,
  imports: [
    IconComponent,
    ConfirmationDialogComponent,
    GeneratedRegressionWorkflowComponent,
    UserDefinedRegressionWorkflowComponent,
    RegressionModelReviewSlideoutComponent,
    RegressionMethodControlComponent
  ],
  providers: [RegressionModelValidationService, FacilityAnalysisRegressionFacade, FacilityAnalysisRegressionController],
  templateUrl: './facility-analysis-regression.component.html',
  styleUrls: ['./facility-analysis-regression.component.css']
})
export class FacilityAnalysisRegressionComponent implements OnDestroy {
  @ViewChild('confirmationModal', { static: true }) private confirmationModal!: TemplateRef<unknown>;

  readonly workflow = inject(FacilityAnalysisRegressionFacade);
  readonly controller = inject(FacilityAnalysisRegressionController);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
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
  readonly modeledQuantityLabel = computed(() => modeledQuantityLabel(this.analysis()?.analysisCategory));
  constructor() {
    effect(() => this.controller.pendingChange() ? this.openConfirmationModal() : this.closeConfirmationModal());
  }

  confirmPendingChange(): void { this.controller.confirmPendingChange(); }
  cancelPendingConfirmation(): void { this.controller.cancelPendingChange(); }
  pendingMethod(): RegressionMethod | undefined {
    const pending = this.controller.pendingChange();
    return pending?.kind === 'method' ? pending.value : undefined;
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

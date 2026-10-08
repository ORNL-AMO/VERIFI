import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, effect, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalysisType } from '@data/models/analysis';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AdjustmentKind, FacilityAnalysisGroupSetupFacade } from './facility-analysis-group-setup.facade';
import { FacilityAnalysisGroupSetupController } from './facility-analysis-group-setup.controller';
import { BankedGroupSavingsComponent } from './banked-group-savings/banked-group-savings.component';

@Component({
  selector: 'app-facility-analysis-group-setup',
  standalone: true,
  imports: [RouterLink, IconComponent, ConfirmationDialogComponent, ReactiveFormsModule, BankedGroupSavingsComponent],
  providers: [FacilityAnalysisGroupSetupFacade, FacilityAnalysisGroupSetupController],
  templateUrl: './facility-analysis-group-setup.component.html',
  styleUrls: ['./facility-analysis-group-setup.component.css']
})
export class FacilityAnalysisGroupSetupComponent implements OnDestroy {
  @ViewChild('modelInputConfirmation', { static: true }) private modelInputConfirmation!: TemplateRef<unknown>;

  private readonly setup = inject(FacilityAnalysisGroupSetupFacade);
  readonly controller = inject(FacilityAnalysisGroupSetupController);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private confirmationOpen = false;

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
  constructor() { effect(() => this.controller.pendingChange() ? this.openConfirmation() : this.closeConfirmation()); }

  confirmPendingChange(): void { this.controller.confirmPendingChange(); }

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

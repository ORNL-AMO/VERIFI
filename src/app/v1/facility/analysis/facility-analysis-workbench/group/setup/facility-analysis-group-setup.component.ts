import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalysisType } from '@data/models/analysis';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AdjustmentKind, FacilityAnalysisGroupSetupFacade } from './facility-analysis-group-setup.facade';

@Component({
  selector: 'app-facility-analysis-group-setup',
  standalone: true,
  imports: [RouterLink, IconComponent, ConfirmationDialogComponent],
  providers: [FacilityAnalysisGroupSetupFacade],
  templateUrl: './facility-analysis-group-setup.component.html',
  styleUrls: ['./facility-analysis-group-setup.component.css']
})
export class FacilityAnalysisGroupSetupComponent implements OnDestroy {
  @ViewChild('modelInputConfirmation', { static: true }) private modelInputConfirmation!: TemplateRef<unknown>;

  private readonly setup = inject(FacilityAnalysisGroupSetupFacade);
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
  readonly pendingType = signal<AnalysisType | undefined>(undefined);
  readonly pendingPredictorId = signal<string | undefined>(undefined);

  requestAnalysisType(type: AnalysisType): void {
    if (type === this.group()?.analysisType) return;
    if (this.hasModels()) {
      this.pendingType.set(type);
      this.openConfirmation();
      return;
    }
    this.setup.changeAnalysisType(type);
  }

  confirmTypeChange(): void {
    const type = this.pendingType();
    this.closeConfirmation();
    if (type) this.setup.changeAnalysisType(type);
  }

  requestPredictor(predictorId: string): void {
    if (this.hasModels()) {
      this.pendingPredictorId.set(predictorId);
      this.openConfirmation();
      return;
    }
    this.setup.togglePredictor(predictorId);
  }

  confirmPredictorChange(): void {
    const predictorId = this.pendingPredictorId();
    this.closeConfirmation();
    if (predictorId) this.setup.togglePredictor(predictorId);
  }

  cancelModelInputChange(): void {
    this.closeConfirmation();
  }

  setLegacyBaseloadMode(event: Event): void { this.setup.setLegacyBaseloadMode(event); }
  setAverageBaseload(event: Event): void { this.setup.setAverageBaseload(event); }
  setMonthlyBaseload(month: number, event: Event): void { this.setup.setMonthlyBaseload(month, event); }
  setAdjustmentYear(kind: AdjustmentKind, event: Event): void { this.setup.setAdjustmentYear(kind, event); }
  setAdjustmentAmount(kind: AdjustmentKind, event: Event): void { this.setup.setAdjustmentAmount(kind, event); }
  openAdjustmentEditor(kind: AdjustmentKind): void { this.setup.openAdjustmentEditor(kind); }
  cancelAdjustmentEditor(kind: AdjustmentKind): void { this.setup.cancelAdjustmentEditor(kind); }
  addAdjustment(kind: AdjustmentKind): void { this.setup.addAdjustment(kind); }
  setAdjustment(kind: AdjustmentKind, year: number, event: Event): void { this.setup.setAdjustment(kind, year, event); }
  removeAdjustment(kind: AdjustmentKind, year: number): void { this.setup.removeAdjustment(kind, year); }
  setApplyBanking(event: Event): void { this.setup.setApplyBanking(event); }
  setBankingYear(field: 'bankedAnalysisYear' | 'newBaselineYear', event: Event): void { this.setup.setBankingYear(field, event); }

  ngOnDestroy(): void {
    this.closeConfirmation();
  }

  private openConfirmation(): void {
    this.confirmationOpen = true;
    this.modalPortal.show(new TemplatePortal(this.modelInputConfirmation, this.viewContainerRef));
  }

  private closeConfirmation(): void {
    this.pendingType.set(undefined);
    this.pendingPredictorId.set(undefined);
    if (!this.confirmationOpen) return;
    this.confirmationOpen = false;
    this.modalPortal.hide();
  }
}

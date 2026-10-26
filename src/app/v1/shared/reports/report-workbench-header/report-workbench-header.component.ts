import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, inject, input, output } from '@angular/core';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { PageBreadcrumb } from '@app/v1/shared/page-identity/page-identity.component';
import { AnalysisNavigationStage } from '@app/v1/shared/analysis-stage-navigation/analysis-stage-navigation.component';
import { ReportConfigurationStatus } from '@app/v1/facility/reports/facility-report.models';
import { ReportWorkbenchEditor } from '../report-autosave-controller';
import { AnalysisChecksWorkflow } from '../analysis-checks.models';

@Component({ selector: 'app-report-workbench-header', standalone: false,
  templateUrl: './report-workbench-header.component.html', styleUrls: ['./report-workbench-header.component.css'] })
export class ReportWorkbenchHeaderComponent implements OnDestroy {
  readonly editor = input.required<ReportWorkbenchEditor>();
  readonly breadcrumbs = input.required<readonly PageBreadcrumb[]>();
  readonly breadcrumbLabel = input('Account report breadcrumb');
  readonly titleId = input('account-report-workbench-title');
  readonly resources = input.required<readonly { id: string; label: string; icon: 'report' }[]>();
  readonly selectedId = input.required<string>();
  readonly name = input.required<string>();
  readonly typeLabel = input.required<string>();
  readonly status = input.required<ReportConfigurationStatus>();
  readonly statusLabel = input.required<string>();
  readonly checksStatus = input<AnalysisChecksWorkflow>();
  readonly facts = input.required<readonly { label: string; value: string }[]>();
  readonly stages = input.required<readonly AnalysisNavigationStage[]>();
  readonly reportSelected = output<string>();
  @ViewChild('discardConfirmation', { static: true }) private confirmation!: TemplateRef<unknown>;
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  private portal?: TemplatePortal;
  requestDiscard(): void {
    if (this.editor().saving() || this.portal) return;
    this.editor().pauseAutosave();
    this.portal = new TemplatePortal(this.confirmation, this.container); this.modal.show(this.portal);
  }
  closeDiscard(discard = false): void {
    if (!this.portal) return;
    if (discard && !this.editor().saving()) this.editor().discard();
    this.editor().resumeAutosave();
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
  }
  ngOnDestroy(): void { this.closeDiscard(); }
}

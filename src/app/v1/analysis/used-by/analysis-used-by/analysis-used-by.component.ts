import { TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, afterRenderEffect, effect, inject, untracked, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { AnalysisUsageService } from '../analysis-usage.service';

@Component({ selector: 'app-analysis-used-by', standalone: true,
  imports: [RouterLink, ReactiveFormsModule, IconComponent, DataEmptyStateComponent, WorkspaceSlideoutComponent, ConfirmationDialogComponent],
  templateUrl: './analysis-used-by.component.html',
  styleUrls: ['./analysis-used-by.component.css', '../../../shared/creation-flow/creation-flow.css'] })
export class AnalysisUsedByComponent implements OnDestroy {
  readonly usage = inject(AnalysisUsageService);
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  @ViewChild('discardConfirmation', { static: true }) private discardConfirmation!: TemplateRef<unknown>;
  private readonly heading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly name = viewChild<ElementRef<HTMLInputElement>>('usageName');
  private portal?: TemplatePortal;
  private focusedStep?: string;
  constructor() {
    afterRenderEffect(() => {
      const editor = this.usage.editor();
      if (!editor) { this.focusedStep = undefined; return; }
      const step = `${editor}:${this.usage.step()}`;
      const target = this.usage.step() === 'review'
        ? this.name()?.nativeElement : this.heading()?.nativeElement;
      if (step && step !== this.focusedStep && target) target.focus();
      this.focusedStep = step;
    });
    effect(() => {
      const show = this.usage.confirmDiscard();
      untracked(() => {
        this.hideConfirmation();
        if (show) { this.portal = new TemplatePortal(this.discardConfirmation, this.container); this.modal.show(this.portal); }
      });
    });
  }
  private hideConfirmation(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
  }
  ngOnDestroy(): void { this.hideConfirmation(); this.usage.close(); }
}

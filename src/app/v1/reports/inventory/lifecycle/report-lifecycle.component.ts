import { TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, afterRenderEffect, effect, inject, untracked, viewChild } from '@angular/core';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { ReportLifecycleService } from './report-lifecycle.service';

@Component({ selector: 'app-report-lifecycle', standalone: false,
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
  templateUrl: './report-lifecycle.component.html', styleUrls: ['./report-lifecycle.component.css', '../../../shared/creation-flow/creation-flow.css'] })
export class ReportLifecycleComponent implements OnDestroy {
  readonly lifecycle = inject(ReportLifecycleService);
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  @ViewChild('deleteConfirmation', { static: true }) private deleteConfirmation!: TemplateRef<unknown>;
  @ViewChild('discardConfirmation', { static: true }) private discardConfirmation!: TemplateRef<unknown>;
  private portal?: TemplatePortal;
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly reportName = viewChild<ElementRef<HTMLInputElement>>('reportName');
  private focusedEditor?: object;
  private focusedStep?: string;
  constructor() {
    afterRenderEffect(() => {
      const editor = this.lifecycle.editor(), step = this.lifecycle.step();
      const target = editor?.entry || step === 'name' ? this.reportName()?.nativeElement : this.stepHeading()?.nativeElement;
      if (editor && target && (editor !== this.focusedEditor || step !== this.focusedStep)) {
        this.focusedEditor = editor;
        this.focusedStep = step;
        target.focus();
      }
    });
    effect(() => {
      const kind = this.lifecycle.confirmation();
      untracked(() => {
        this.hide();
        if (kind) {
          this.portal = new TemplatePortal(kind === 'delete' ? this.deleteConfirmation : this.discardConfirmation, this.container);
          this.modal.show(this.portal);
        }
      });
    });
  }
  beforeUnload(event: BeforeUnloadEvent): void { if (this.lifecycle.navigationBlocked()) { event.preventDefault(); event.returnValue = ''; } }
  private hide(): void { if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide(); this.portal = undefined; }
  ngOnDestroy(): void { this.hide(); }
}

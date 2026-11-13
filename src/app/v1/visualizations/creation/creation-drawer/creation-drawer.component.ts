import { TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, afterRenderEffect, effect, inject, untracked, viewChild } from '@angular/core';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { VISUALIZATION_CHART_CHOICES } from '../../visualization-charts';
import { LibraryLifecycle } from '../../library/lifecycle/library-lifecycle.service';
import { visualizationDataSourceChoices } from '../../visualization-data-sources';

@Component({ selector: 'app-visualization-creation', standalone: false,
  templateUrl: './creation-drawer.component.html', styleUrls: ['./creation-drawer.component.css', '../../../shared/creation-flow/creation-flow.css'] })
export class CreationComponent implements OnDestroy {
  readonly lifecycle = inject(LibraryLifecycle);
  readonly dataSources = visualizationDataSourceChoices();
  readonly charts = VISUALIZATION_CHART_CHOICES.filter(chart => !['area', 'breakdown-bar'].includes(chart.value));
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly visualizationName = viewChild<ElementRef<HTMLInputElement>>('visualizationName');
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  @ViewChild('deleteConfirmation', { static: true }) private deleteConfirmation!: TemplateRef<unknown>;
  @ViewChild('discardConfirmation', { static: true }) private discardConfirmation!: TemplateRef<unknown>;
  @ViewChild('decisionConfirmation', { static: true }) private decisionConfirmation!: TemplateRef<unknown>;
  private portal?: TemplatePortal;
  constructor() {
    let focusedStep: string | undefined;
    let focusedEditor: unknown;
    afterRenderEffect(() => {
      const editor = this.lifecycle.editor(), step = this.lifecycle.step();
      const target = editor?.entry || step === 'name' ? this.visualizationName()?.nativeElement : this.stepHeading()?.nativeElement;
      if (target && (focusedStep !== step || focusedEditor !== editor)) {
        focusedStep = step; focusedEditor = editor; target.focus();
      }
    });
    effect(() => {
      const confirmation = this.lifecycle.confirmation();
      untracked(() => {
        this.hide();
        if (confirmation) {
          this.portal = new TemplatePortal(confirmation === 'delete' ? this.deleteConfirmation : confirmation === 'decision' ? this.decisionConfirmation : this.discardConfirmation, this.container);
          this.modal.show(this.portal, { blockWorkspace: true });
        }
      });
    });
  }
  private hide(): void { if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide(); this.portal = undefined; }
  ngOnDestroy(): void { this.hide(); }
}

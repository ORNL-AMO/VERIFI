import { DOCUMENT } from '@angular/common';
import { InteractivityChecker } from '@angular/cdk/a11y';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, ElementRef, TemplateRef, ViewChild, ViewContainerRef, afterRenderEffect, effect, inject, signal, untracked } from '@angular/core';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { HomeContext } from '../home-context.service';
import { HomePrintState } from '../home-print-state.service';
import { HomeEditor } from '../home-editor.service';

@Component({ selector: 'app-home-dashboard', standalone: false, templateUrl: './dashboard.component.html', styleUrls: ['./dashboard.component.css'] })
export class HomeDashboardComponent {
  readonly home = inject(HomeContext);
  readonly editor = inject(HomeEditor);
  readonly printing = inject(HomePrintState);
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  @ViewChild('confirmation', { static: true }) private confirmation!: TemplateRef<unknown>;
  private portal?: TemplatePortal;
  private readonly document = inject(DOCUMENT);
  private readonly checker = inject(InteractivityChecker);
  private modalOpener?: HTMLElement;
  private readonly restoreOpener = signal<HTMLElement | undefined>(undefined);
  constructor() {
    const release = this.editor.attach();
    inject(DestroyRef).onDestroy(() => { release(); this.hide(); });
    effect(() => {
      const confirmation = this.editor.confirmation();
      untracked(() => {
        const previous = this.portal;
        if (confirmation && !previous) this.modalOpener = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : undefined;
        this.hide();
        if (confirmation) {
          this.portal = new TemplatePortal(this.confirmation, this.container);
          this.modal.show(this.portal, { blockWorkspace: true });
        } else if (previous) this.restoreOpener.set(this.modalOpener);
      });
    });
    let lastFocus: unknown, lastDashboard: string | undefined;
    afterRenderEffect(() => {
      const opener = this.restoreOpener();
      if (opener && !this.editor.confirmation()) {
        this.restoreOpener.set(undefined);
        if (opener.isConnected && this.checker.isFocusable(opener)) opener.focus();
      }
      const focus = this.editor.focusRequest(), dashboard = this.home.selectedGuid();
      if (focus !== lastFocus || dashboard !== lastDashboard) {
        lastFocus = focus; lastDashboard = dashboard;
        const root = this.element.nativeElement;
        const row = focus?.target === 'dashboard-order' ? [...root.querySelectorAll<HTMLElement>('[data-dashboard-guid]')].find(row => row.dataset['dashboardGuid'] === focus.guid) : undefined;
        const widget = focus?.guid ? [...root.querySelectorAll<HTMLElement>('[data-widget-id]')].find(card => card.dataset['widgetId'] === focus.guid) : undefined;
        const widgetTarget = focus?.target === 'widget-editor' ? widget?.querySelector<HTMLElement>('[data-note-field], [data-widget-title]')
          : focus?.target === 'widget' ? widget?.querySelector<HTMLElement>('h2') : focus?.target === 'add-widget' ? root.querySelector<HTMLElement>('#home-add-widget-title') : undefined;
        const target = widgetTarget ?? row?.querySelector<HTMLElement>('button:not(:disabled), a')
          ?? root.querySelector<HTMLElement>(focus?.target === 'recipe' && this.editor.session()?.mode === 'restore' ? '#home-recipe' : focus?.target === 'name' && this.editor.session()?.mode !== 'view' ? '#home-name' : '#home-title');
        target?.focus();
      }
    });
  }
  private hide(): void { if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide(); this.portal = undefined; }
}

import { DOCUMENT } from '@angular/common';
import { TemplatePortal } from '@angular/cdk/portal';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, Injector, TemplateRef, ViewContainerRef, afterNextRender, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { ReportPresentationController } from '../report-presentation-controller';

interface ScrollPosition {
  readonly element: HTMLElement;
  readonly top: number;
  readonly left: number;
  readonly overflowX: string;
  readonly overflowY: string;
}

interface PresentationAttempt {
  readonly portal: TemplatePortal;
  readonly opener: Element | null;
  readonly positions: readonly ScrollPosition[];
  element?: HTMLElement;
  enteredFullscreen: boolean;
  documentObserver?: ResizeObserver;
}

@Component({
  selector: 'app-report-presentation', standalone: false,
  templateUrl: './report-presentation.component.html', styleUrls: ['./report-presentation.component.css'],
  host: { tabindex: '-1', '(window:resize)': 'resizeDocument()' }
})
export class ReportPresentationComponent {
  readonly title = input.required<string>();
  readonly content = input.required<TemplateRef<unknown>>();
  readonly available = input.required<boolean>();
  readonly presenting = signal(false);
  readonly fallbackMessage = signal('');
  readonly zoomPercent = signal(100);
  readonly minimumZoom = 50;
  readonly maximumZoom = 200;
  readonly documentWidth = signal<number | null>(null);
  private readonly documentSize = signal({ width: 0, height: 0 });
  readonly scaledWidth = computed(() => this.documentSize().width ? this.documentSize().width * this.zoomPercent() / 100 : null);
  readonly scaledHeight = computed(() => this.documentSize().height * this.zoomPercent() / 100);
  private readonly controller = inject(ReportPresentationController);
  private readonly modal = inject(ModalPortalService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly container = inject(ViewContainerRef);
  private readonly changes = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly overlay = viewChild.required<TemplateRef<unknown>>('overlay');
  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly reportDocument = viewChild<ElementRef<HTMLElement>>('reportDocument');
  private attempt?: PresentationAttempt;
  private appliedZoom = 100;

  constructor() {
    let unregister = () => {};
    afterNextRender(() => {
      unregister = this.controller.register({ available: this.available, present: () => this.present() });
    });
    effect(() => {
      const portal = this.modal.activePortal(), available = this.available();
      if (this.attempt && (!available || portal !== this.attempt.portal)) this.close();
    });
    this.document.addEventListener('fullscreenchange', this.fullscreenChanged);
    this.destroyRef.onDestroy(() => {
      unregister();
      this.close();
      this.document.removeEventListener('fullscreenchange', this.fullscreenChanged);
    });
  }

  private present(): void {
    if (!this.available() || this.attempt || this.modal.activePortal()) return;
    const attempt: PresentationAttempt = {
      portal: new TemplatePortal(this.overlay(), this.container), opener: this.document.activeElement,
      positions: this.lockScrolling(), enteredFullscreen: false
    };
    this.attempt = attempt;
    this.fallbackMessage.set('');
    this.zoomPercent.set(100);
    this.appliedZoom = 100;
    this.documentWidth.set(null);
    this.documentSize.set({ width: 0, height: 0 });
    this.presenting.set(true);
    // Remove the inline copy before the shell attaches the very same document template.
    this.changes.detectChanges();
    this.modal.show(attempt.portal, { blockWorkspace: true });
    afterNextRender(() => {
      if (this.attempt !== attempt) return;
      const element = this.surface()?.nativeElement;
      if (!element) { this.close(); return; }
      attempt.element = element;
      this.resizeDocument();
      this.observeDocument(attempt);
      void this.enterFullscreen(attempt, element);
    }, { injector: this.injector });
  }

  zoomIn(): void { this.setZoom(this.zoomPercent() + 10); }
  zoomOut(): void { this.setZoom(this.zoomPercent() - 10); }
  resetZoom(): void { this.setZoom(100); }

  resizeDocument(): void {
    const viewport = this.viewport()?.nativeElement;
    if (!this.attempt || !viewport) return;
    const style = getComputedStyle(viewport);
    // Keep the report's unzoomed layout width, so zoom magnifies tables and charts together.
    this.documentWidth.set(Math.max(1, viewport.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)));
  }

  private observeDocument(attempt: PresentationAttempt): void {
    const document = this.reportDocument()?.nativeElement;
    if (!document) return;
    const bounds = document.getBoundingClientRect();
    this.documentSize.set({ width: bounds.width, height: bounds.height });
    if (typeof ResizeObserver === 'undefined') return;
    attempt.documentObserver = new ResizeObserver(entries => {
      if (this.attempt !== attempt || !document.isConnected) return;
      const entry = entries.find(entry => entry.target === document);
      if (!entry) return;
      // Border-box sizes are unscaled, including fractional widths and late chart/image layout.
      const box = entry.borderBoxSize[0];
      this.documentSize.set({ width: box?.inlineSize ?? document.offsetWidth, height: box?.blockSize ?? document.offsetHeight });
    });
    attempt.documentObserver.observe(document);
  }

  private setZoom(value: number): void {
    const viewport = this.viewport()?.nativeElement;
    const document = this.reportDocument()?.nativeElement;
    const attempt = this.attempt;
    if (!attempt || !viewport || !document) return;
    const next = Math.max(this.minimumZoom, Math.min(this.maximumZoom, value));
    if (next === this.zoomPercent()) return;
    const bounds = viewport.getBoundingClientRect(), report = document.getBoundingClientRect();
    const centerX = bounds.left + viewport.clientLeft + viewport.clientWidth / 2;
    const centerY = bounds.top + viewport.clientTop + viewport.clientHeight / 2;
    const x = (centerX - report.left) / (this.appliedZoom / 100);
    const y = (centerY - report.top) / (this.appliedZoom / 100);
    this.zoomPercent.set(next);
    // The portal is rendered at the shell outlet. Restore the reading position only
    // after that view has resized, so the old scroll bounds cannot clamp it.
    afterNextRender(() => {
      if (this.attempt !== attempt || this.zoomPercent() !== next) return;
      this.appliedZoom = next;
      const report = document.getBoundingClientRect();
      const bounds = viewport.getBoundingClientRect();
      viewport.scrollLeft += report.left + x * next / 100 - (bounds.left + viewport.clientLeft + viewport.clientWidth / 2);
      viewport.scrollTop += report.top + y * next / 100 - (bounds.top + viewport.clientTop + viewport.clientHeight / 2);
    }, { injector: this.injector });
  }

  close(): void {
    const attempt = this.attempt;
    if (!attempt) return;
    this.attempt = undefined;
    attempt.documentObserver?.disconnect();
    this.presenting.set(false);
    if (this.modal.activePortal() === attempt.portal) this.modal.hide();
    this.exitOwnedFullscreen(attempt);
    for (const position of attempt.positions) {
      position.element.style.overflowX = position.overflowX;
      position.element.style.overflowY = position.overflowY;
    }
    if (this.destroyRef.destroyed) return;
    afterNextRender(() => {
      if (this.attempt || this.modal.activePortal()) return;
      for (const position of attempt.positions) {
        if (!position.element.isConnected) continue;
        position.element.scrollTop = position.top;
        position.element.scrollLeft = position.left;
      }
      const opener = attempt.opener;
      if (opener instanceof HTMLElement && opener.isConnected && !opener.matches(':disabled')
          && !opener.closest('[inert], [hidden], [aria-hidden="true"]') && opener.getClientRects().length) {
        opener.focus({ preventScroll: true });
      } else if (this.host.isConnected) this.host.focus({ preventScroll: true });
    }, { injector: this.injector });
  }

  private async enterFullscreen(attempt: PresentationAttempt, element: HTMLElement): Promise<void> {
    // Leave an existing, independently owned fullscreen session untouched.
    if (!element.requestFullscreen || this.document.fullscreenElement) {
      this.fallbackMessage.set('Showing presentation in this window. Fullscreen is unavailable.');
      return;
    }
    try {
      await element.requestFullscreen();
      if (this.attempt !== attempt) { this.exitOwnedFullscreen(attempt); return; }
      attempt.enteredFullscreen = this.document.fullscreenElement === element;
    } catch {
      if (this.attempt === attempt) this.fallbackMessage.set('Showing presentation in this window. Fullscreen is unavailable.');
    }
  }

  private readonly fullscreenChanged = (): void => {
    const attempt = this.attempt;
    if (!attempt?.element) return;
    if (this.document.fullscreenElement === attempt.element) attempt.enteredFullscreen = true;
    else if (attempt.enteredFullscreen) this.close();
  };

  private exitOwnedFullscreen(attempt: PresentationAttempt): void {
    if (attempt.element && this.document.fullscreenElement === attempt.element) {
      void this.document.exitFullscreen().catch(() => { /* The browser may already be exiting. */ });
    }
  }

  private lockScrolling(): readonly ScrollPosition[] {
    const positions: ScrollPosition[] = [];
    for (let element = this.host.parentElement; element; element = element.parentElement) {
      const style = getComputedStyle(element);
      if (element !== this.document.scrollingElement && !/(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY)) continue;
      positions.push({ element, top: element.scrollTop, left: element.scrollLeft,
        overflowX: element.style.overflowX, overflowY: element.style.overflowY });
      element.style.overflowX = 'hidden';
      element.style.overflowY = 'hidden';
    }
    return positions;
  }
}

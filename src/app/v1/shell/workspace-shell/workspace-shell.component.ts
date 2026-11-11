import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject } from '@angular/core';
import { CommandNotificationBridgeService } from '@app/v1/shared/notifications/command-notification-bridge.service';
import { VisualizationImportNotificationBridgeService } from '@app/v1/shared/notifications/visualization-import-notification-bridge.service';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

@Component({
  selector: 'app-workspace-shell',
  templateUrl: './workspace-shell.component.html',
  styleUrls: ['./workspace-shell.component.css'],
  standalone: false
})
export class WorkspaceShellComponent implements OnDestroy {
  private readonly commandNotificationBridge = inject(CommandNotificationBridgeService);
  private readonly visualizationImportNotifications = inject(VisualizationImportNotificationBridgeService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private workspace?: HTMLElement;
  private content?: HTMLElement;
  private view?: Window;
  private resizeObserver?: ResizeObserver;
  private contentObserver?: MutationObserver;
  private readonly footers = new Set<HTMLElement>();
  private clearanceFrame?: number;
  private clearance = -1;
  private destroyed = false;
  readonly navigation = inject(WorkspaceNavigationService);

  constructor() {
    afterNextRender(() => this.zone.runOutsideAngular(() => this.observeFooterClearance()));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.contentObserver?.disconnect();
    this.content?.removeEventListener('scroll', this.scheduleFooterClearance);
    this.view?.removeEventListener('resize', this.scheduleFooterClearance);
    this.view?.removeEventListener('scroll', this.scheduleFooterClearance);
    if (this.clearanceFrame !== undefined) this.view?.cancelAnimationFrame(this.clearanceFrame);
    this.footers.clear();
  }

  private observeFooterClearance(): void {
    if (this.destroyed) return;
    this.workspace = this.element.nativeElement.querySelector<HTMLElement>('.v1-workspace') ?? undefined;
    this.content = this.element.nativeElement.querySelector<HTMLElement>('.v1-workspace__main') ?? undefined;
    this.view = this.element.nativeElement.ownerDocument.defaultView ?? undefined;
    if (!this.workspace || !this.content || !this.view) return;
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.scheduleFooterClearance);
      this.resizeObserver.observe(this.workspace);
      this.resizeObserver.observe(this.content);
    }
    if (typeof MutationObserver !== 'undefined') {
      this.contentObserver = new MutationObserver(this.scheduleFooterClearance);
      this.contentObserver.observe(this.content, { childList: true, subtree: true });
    }
    this.content.addEventListener('scroll', this.scheduleFooterClearance, { passive: true });
    this.view.addEventListener('resize', this.scheduleFooterClearance, { passive: true });
    this.view.addEventListener('scroll', this.scheduleFooterClearance, { passive: true });
    this.scheduleFooterClearance();
  }

  private readonly scheduleFooterClearance = (): void => {
    if (this.destroyed || !this.view || this.clearanceFrame !== undefined) return;
    if (typeof this.view.requestAnimationFrame !== 'function') {
      this.measureFooterClearance();
      return;
    }
    this.clearanceFrame = this.view.requestAnimationFrame(() => {
      this.clearanceFrame = undefined;
      this.measureFooterClearance();
    });
  };

  private measureFooterClearance(): void {
    if (this.destroyed || !this.workspace || !this.content || !this.view) return;
    const current = new Set(this.content.querySelectorAll<HTMLElement>('.v1-wizard-actions'));
    for (const footer of this.footers) if (!current.has(footer)) {
      this.resizeObserver?.unobserve(footer);
      this.footers.delete(footer);
    }
    for (const footer of current) if (!this.footers.has(footer)) {
      this.footers.add(footer);
      this.resizeObserver?.observe(footer);
    }
    const workspace = this.workspace.getBoundingClientRect(), content = this.content.getBoundingClientRect();
    const viewportTop = Math.max(workspace.top, content.top, 0);
    const viewportBottom = Math.min(workspace.bottom, content.bottom, this.view.innerHeight);
    let clearance = 0;
    for (const footer of current) {
      const rect = footer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.bottom > viewportTop && rect.top < viewportBottom) {
        clearance = Math.max(clearance, workspace.bottom - Math.max(rect.top, viewportTop));
      }
    }
    clearance = Math.max(0, Math.ceil(clearance));
    if (clearance !== this.clearance) {
      this.clearance = clearance;
      this.workspace.style.setProperty('--v1-workspace-footer-clearance', `${clearance}px`);
    }
  }
}

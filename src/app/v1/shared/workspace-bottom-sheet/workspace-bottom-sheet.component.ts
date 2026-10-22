import { Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalFocusTrapDirective } from '@app/v1/shared/a11y/modal-focus-trap.directive';

@Component({ selector: 'app-workspace-bottom-sheet', standalone: true, imports: [IconComponent, ModalFocusTrapDirective],
  templateUrl: './workspace-bottom-sheet.component.html', styleUrls: ['./workspace-bottom-sheet.component.css'] })
export class WorkspaceBottomSheetComponent {
  readonly panelId = input.required<string>();
  readonly title = input.required<string>();
  readonly closeLabel = input('Close panel');
  readonly dismissLabel = input('Dismiss panel');
  readonly surfaceClass = input('');
  readonly initialFocus = input<string>();
  readonly focusFallback = input<string>();
  readonly closed = output<void>();
  readonly closing = signal(false);
  readonly classes = computed(() => `workspace-bottom-sheet ${this.surfaceClass()}${this.closing() ? ' workspace-bottom-sheet--closing ' + (this.surfaceClass() ? this.surfaceClass() + '--closing' : '') : ''}`);
  private closeTimer?: ReturnType<typeof setTimeout>;
  private pullStart?: number;
  private suppressClick = false;
  requestClose(): void {
    if (this.closing()) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { this.closed.emit(); return; }
    this.closing.set(true);
    this.closeTimer = setTimeout(() => this.finishClose(), 360);
  }
  finishClose(event?: AnimationEvent): void {
    if (event && (!event.animationName.endsWith('workspace-sheet-down') || event.composedPath()[0] !== event.currentTarget)) return;
    if (!this.closing()) return;
    clearTimeout(this.closeTimer); this.closed.emit();
  }
  startPull(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.pullStart = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }
  finishPull(event: PointerEvent): void {
    if (this.pullStart !== undefined) {
      const distance = event.clientY - this.pullStart;
      if (distance >= 35) this.requestClose();
      else if (distance <= -35) this.suppressClick = true;
    }
    this.pullStart = undefined;
  }
  clickHandle(): void { if (this.suppressClick) this.suppressClick = false; else this.requestClose(); }
  cancelPull(): void { this.pullStart = undefined; }
  ngOnDestroy(): void { clearTimeout(this.closeTimer); }
}

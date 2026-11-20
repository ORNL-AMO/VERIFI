import { Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, inject, signal } from '@angular/core';

export type PanelResizeIntent = { readonly kind: 'begin' | 'commit' | 'cancel' | 'reset' }
  | { readonly kind: 'preview' | 'set'; readonly width: number };

@Component({
  selector: 'app-panel-resize-handle',
  templateUrl: './panel-resize-handle.component.html',
  styleUrls: ['./panel-resize-handle.component.css'],
  standalone: false,
  host: {
    role: 'separator', 'aria-orientation': 'vertical',
    title: 'Drag past the minimum to collapse. Use Arrow keys to resize, Home to collapse, or Enter to reset.',
    'aria-description': 'Use Left and Right Arrow keys to resize or reopen, Shift for larger steps, Home to collapse, End for maximum width, Enter to reset, and Escape to cancel dragging.',
    '[attr.tabindex]': 'disabled ? -1 : 0', '[attr.aria-label]': 'label',
    '[attr.aria-controls]': 'panelId', '[attr.aria-valuenow]': 'value',
    '[attr.aria-valuemin]': 'min', '[attr.aria-valuemax]': 'max',
    '[attr.aria-valuetext]': 'value === 0 ? "Collapsed" : value + " pixels"', '[attr.aria-disabled]': 'disabled',
    '[class.is-dragging]': 'dragging()', '[class.is-disabled]': 'disabled',
    '(pointerdown)': 'start($event)',
    '(pointerup)': 'finish($event)', '(pointercancel)': 'cancel()',
    '(lostpointercapture)': 'cancel()', '(window:blur)': 'cancel()',
    '(window:resize)': 'cancel()', '(keydown)': 'key($event)',
    '(document:keydown.escape)': 'cancel()', '(dblclick)': 'reset()'
  }
})
export class PanelResizeHandleComponent implements OnChanges, OnDestroy {
  @Input() label = '';
  @Input() panelId = '';
  @Input() value = 0;
  @Input() min = 0;
  @Input() max = 0;
  @Input() reopenWidth = 0;
  @Input() expandedMin = 0;
  @Input() direction: 1 | -1 = 1;
  @Input() disabled = false;
  @Input() resizing = false;
  @Output() readonly resizeIntent = new EventEmitter<PanelResizeIntent>();
  readonly dragging = signal(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly pointerMoved = (event: PointerEvent): void => this.move(event);
  private pointer?: { id: number; x: number; width: number };
  private pendingWidth?: number;
  private frame?: number;
  private previousSelection = '';
  private previousCursor = '';

  constructor() {
    this.zone.runOutsideAngular(() => this.element.nativeElement.addEventListener('pointermove', this.pointerMoved));
  }

  ngOnChanges(): void {
    if (this.disabled || (this.dragging() && !this.resizing)) this.cancel();
  }

  start(event: PointerEvent): void {
    if (this.disabled || this.pointer || event.button !== 0 || !event.isPrimary) return;
    const host = this.element.nativeElement;
    event.preventDefault();
    host.focus({ preventScroll: true });
    host.setPointerCapture(event.pointerId);
    this.pointer = { id: event.pointerId, x: event.clientX, width: this.value };
    this.dragging.set(true);
    const style = host.ownerDocument.documentElement.style;
    this.previousSelection = style.userSelect;
    this.previousCursor = style.cursor;
    style.userSelect = 'none'; style.cursor = 'col-resize';
    this.resizeIntent.emit({ kind: 'begin' });
  }

  move(event: PointerEvent): void {
    if (this.pointer?.id !== event.pointerId) return;
    this.pendingWidth = this.pointer.width + (event.clientX - this.pointer.x) * this.direction;
    if (this.frame !== undefined) return;
    this.frame = this.element.nativeElement.ownerDocument.defaultView!.requestAnimationFrame(() => {
      this.frame = undefined;
      this.flush();
    });
  }

  finish(event: PointerEvent): void {
    if (this.pointer?.id !== event.pointerId) return;
    // Include the release position even when no animation frame ran after the last movement.
    if (this.pendingWidth !== undefined || this.value !== this.pointer.width || event.clientX !== this.pointer.x) {
      this.pendingWidth = this.pointer.width + (event.clientX - this.pointer.x) * this.direction;
    }
    this.flush();
    this.cleanUp();
    this.resizeIntent.emit({ kind: 'commit' });
  }

  cancel(): void {
    if (!this.pointer) return;
    this.cleanUp();
    this.resizeIntent.emit({ kind: 'cancel' });
  }

  reset(): void {
    if (this.disabled) return;
    this.cancel();
    this.resizeIntent.emit({ kind: 'reset' });
  }

  key(event: KeyboardEvent): void {
    if (this.disabled) return;
    if (event.key === 'Escape') { this.cancel(); return; }
    if (this.pointer) return;
    if (event.key === 'Enter') { event.preventDefault(); this.reset(); return; }
    const step = event.shiftKey ? 32 : 8;
    const width = event.key === 'Home' ? this.min : event.key === 'End' ? this.max
      : event.key === 'ArrowLeft' ? this.value - step * this.direction
      : event.key === 'ArrowRight' ? this.value + step * this.direction : undefined;
    if (width === undefined) return;
    event.preventDefault();
    // Cross the snap range in one keypress when collapsing/reopening at the boundary.
    const arrow = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const snapped = arrow && width > this.value && this.value === 0 ? this.reopenWidth
      : arrow && width < this.value && this.value <= this.expandedMin ? 0 : width;
    this.resizeIntent.emit({ kind: 'set', width: snapped });
  }

  ngOnDestroy(): void {
    this.cancel();
    this.element.nativeElement.removeEventListener('pointermove', this.pointerMoved);
  }

  private flush(): void {
    if (this.pendingWidth === undefined) return;
    const width = this.pendingWidth;
    this.zone.run(() => this.resizeIntent.emit({ kind: 'preview', width }));
    this.pendingWidth = undefined;
  }

  private cleanUp(): void {
    const host = this.element.nativeElement, pointer = this.pointer;
    this.pointer = undefined;
    if (this.frame !== undefined) host.ownerDocument.defaultView?.cancelAnimationFrame(this.frame);
    this.frame = undefined; this.pendingWidth = undefined;
    this.dragging.set(false);
    const style = host.ownerDocument.documentElement.style;
    style.userSelect = this.previousSelection; style.cursor = this.previousCursor;
    if (pointer && host.hasPointerCapture(pointer.id)) host.releasePointerCapture(pointer.id);
  }
}

import { HomeEditor } from '../home-editor.service';
import { Component, computed, effect, input, output, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { HomeWidget } from '@domain/home/home-dashboard';
import { availableHomeCharts, HomeShortcutChoice, HomeWidgetView } from '../home-widget-view';

let nextHeading = 0;
@Component({ selector: 'app-home-widget-card', standalone: false, templateUrl: './widget-card.component.html', styleUrls: ['./widget-card.component.css'],
  host: { role: 'listitem', '[attr.data-widget-id]': 'view().widget.id', '[class.home-widget--full]': 'view().widget.size === "full"',
    '(document:pointerup)': 'resizeEnd($event)', '(document:pointercancel)': 'resizeCancel()', '(window:blur)': 'resizeCancel()' } })
export class HomeWidgetCardComponent {
  readonly editor = inject(HomeEditor);
  readonly view = input.required<HomeWidgetView>();
  readonly editing = input(false);
  readonly enabled = input(false);
  readonly index = input(0);
  readonly count = input(1);
  readonly shortcuts = input<readonly HomeShortcutChoice[]>([]);
  readonly changed = output<{ readonly widget: HomeWidget; readonly repairPaths?: readonly string[] }>();
  readonly moved = output<-1 | 1>();
  readonly removed = output<void>();
  readonly headingId = `home-widget-heading-${++nextHeading}`;
  readonly title = new FormControl('', { nonNullable: true });
  readonly text = new FormControl('', { nonNullable: true });
  readonly size = new FormControl<'half' | 'full'>('full', { nonNullable: true });
  readonly destination = new FormControl<string | null>(null);
  readonly replacement = new FormControl('', { nonNullable: true });
  readonly charts = computed(() => { const snapshot = this.editor.home.workspace.snapshot(); return snapshot ? availableHomeCharts(snapshot) : []; });
  readonly resizing = signal(false);
  private pointerStart?: { readonly id: number; readonly x: number; readonly target: HTMLElement };
  readonly targetUnavailable = computed(() => this.view().widget.kind === 'shortcut' && (!this.view().shortcut || this.view().state !== 'ready'));

  constructor() {
    effect(() => {
      const view = this.view(), widget = view.widget, enabled = this.editing() && this.enabled();
      this.title.setValue(widget.title ?? '', { emitEvent: false });
      this.text.setValue(widget.kind === 'note' ? widget.text : '', { emitEvent: false });
      this.size.setValue(widget.size, { emitEvent: false });
      this.destination.setValue(widget.kind === 'shortcut' ? view.shortcut && view.state === 'ready' ? view.shortcut.key : '__unavailable__' : null, { emitEvent: false });
      this.replacement.setValue(this.editor.session()?.replacements?.[widget.id] ?? '', { emitEvent: false });
      for (const control of [this.title, this.text, this.size, this.destination, this.replacement]) enabled ? control.enable({ emitEvent: false }) : control.disable({ emitEvent: false });
    });
    this.replacement.valueChanges.pipe(takeUntilDestroyed()).subscribe(guid => { if (this.enabled() && this.editing()) this.editor.chooseReplacement(this.view().widget.id, guid); });
    this.title.valueChanges.pipe(takeUntilDestroyed()).subscribe(title => {
      if (this.enabled() && this.editing() && title !== (this.view().widget.title ?? '')) this.changed.emit({ widget: { ...this.view().widget, title } });
    });
    this.text.valueChanges.pipe(takeUntilDestroyed()).subscribe(text => {
      const widget = this.view().widget;
      if (this.enabled() && this.editing() && widget.kind === 'note' && widget.text !== text) this.changed.emit({ widget: { ...widget, text } });
    });
    this.size.valueChanges.pipe(takeUntilDestroyed()).subscribe(size => {
      if (this.enabled() && this.editing() && size !== this.view().widget.size) this.changed.emit({ widget: { ...this.view().widget, size } });
    });
    this.destination.valueChanges.pipe(takeUntilDestroyed()).subscribe(key => {
      const widget = this.view().widget, choice = this.shortcuts().find(choice => choice.key === key);
      if (!this.enabled() || !this.editing() || widget.kind !== 'shortcut' || !choice) return;
      const repairPaths = this.view().blockedPaths;
      this.changed.emit({ widget: { ...widget, destination: choice.destination }, ...(repairPaths ? { repairPaths } : {}) });
    });
  }
  resizeStart(event: PointerEvent): void {
    if (!this.enabled() || !this.editing() || event.button !== 0) return;
    const target = event.currentTarget as HTMLElement;
    this.pointerStart = { id: event.pointerId, x: event.clientX, target }; this.resizing.set(true);
    target.setPointerCapture(event.pointerId); event.preventDefault();
  }
  resizeEnd(event: PointerEvent): void {
    const start = this.pointerStart;
    if (!start || start.id !== event.pointerId) return;
    this.pointerStart = undefined; this.resizing.set(false);
    const target = start.target;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    if (!this.enabled()) return;
    const delta = event.clientX - start.x;
    if (Math.abs(delta) >= 40) this.size.setValue(delta > 0 ? 'full' : 'half');
  }
  resizeCancel(): void { this.pointerStart = undefined; this.resizing.set(false); }
}

import { Component, ElementRef, TemplateRef, afterRenderEffect, input, output, signal, viewChild } from '@angular/core';
import { AddYearController } from './add-year.controller';

@Component({ selector: 'app-energy-use-add-year-drawer', standalone: false,
  templateUrl: './add-year-drawer.component.html', styleUrls: ['./add-year-drawer.component.css', '../../../../shared/creation-flow/creation-flow.css'] })
export class AddYearDrawerComponent {
  readonly controller = input.required<AddYearController>();
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly calculator = signal<TemplateRef<unknown> | null>(null);
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  private focused = '';
  constructor() {
    afterRenderEffect(() => {
      const c = this.controller(), key = `${c.index()}:${c.otherYear()}:${!!this.calculator()}:${c.current()?.error ?? ''}`;
      const root = this.content()?.nativeElement;
      if (root && key !== this.focused) {
        this.focused = key;
        const target = root.querySelector<HTMLElement>(this.calculator() ? '#embedded-calculator-title' : c.index() < 0 ? c.otherYear() ? '#add-year-input' : '.year-draft__years button' : '#equipment-year-title');
        target?.focus(); target?.scrollIntoView?.({ block: 'nearest' });
      }
    });
  }
  requestClose(): void { if (this.controller().requestClose()) this.closed.emit(); }
  discard(): void { this.controller().discard(); if (!this.controller().opened()) this.closed.emit(); }
  async save(): Promise<void> { if (await this.controller().save()) this.saved.emit(); }
  async recover(): Promise<void> { if (await this.controller().recover()) this.saved.emit(); }
}

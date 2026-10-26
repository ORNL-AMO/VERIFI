import { Component, ElementRef, afterRenderEffect, effect, input, output, viewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalysisChecksWorkflow } from '../analysis-checks.models';

@Component({ selector: 'app-analysis-checks-acknowledgment', standalone: false,
  templateUrl: './analysis-checks-acknowledgment.component.html', styleUrls: ['./analysis-checks-acknowledgment.component.css'] })
export class AnalysisChecksAcknowledgmentComponent {
  readonly workflow = input.required<AnalysisChecksWorkflow>();
  readonly acknowledged = output<void>();
  readonly control = new FormControl(false, { nonNullable: true });
  private readonly checkbox = viewChild<ElementRef<HTMLInputElement>>('checkbox');
  private readonly completion = viewChild<ElementRef<HTMLElement>>('completion');
  private restoreFocus = false;
  private focusKey?: string;

  constructor() {
    effect(() => {
      const workflow = this.workflow();
      if (this.focusKey !== workflow.key) this.restoreFocus = false;
      this.control.setValue(workflow.completed || workflow.saving, { emitEvent: false });
      if (workflow.canConfirm) this.control.enable({ emitEvent: false });
      else this.control.disable({ emitEvent: false });
    });
    this.control.valueChanges.pipe(takeUntilDestroyed()).subscribe(checked => {
      if (checked && this.workflow().canConfirm) {
        const checkbox = this.checkbox()?.nativeElement;
        this.restoreFocus = !!checkbox && checkbox.ownerDocument.activeElement === checkbox;
        this.focusKey = this.workflow().key;
        this.acknowledged.emit();
      }
    });
    afterRenderEffect(() => {
      const completion = this.completion()?.nativeElement;
      if (completion && this.restoreFocus) {
        if (completion.ownerDocument.activeElement === completion.ownerDocument.body) completion.focus();
        this.restoreFocus = false;
      }
    });
  }
}

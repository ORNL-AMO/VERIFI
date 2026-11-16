import { Component, DestroyRef, Input, OnChanges, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VisualizationDecisionAction, VisualizationDecisionItem } from '../../../decisions/decision-types';
import { decisionNodeId } from '../../../decisions/decision-tree';

@Component({ selector: 'app-visualization-item-settings', standalone: false,
  templateUrl: './item-settings.component.html', styleUrls: ['./item-settings.component.css'] })
export class ItemSettingsComponent implements OnChanges {
  private readonly destroy = inject(DestroyRef);
  private readonly current = signal<VisualizationDecisionItem | undefined>(undefined);
  private identity = '';
  private fingerprint = '';
  readonly disabled = input(false);
  readonly editorKey = input('');
  readonly resetKey = input(0);
  readonly expandedNodes = input<ReadonlySet<string>>(new Set());
  readonly requested = output<VisualizationDecisionAction>();
  readonly sectionChanged = output<{ readonly id: string; readonly expanded: boolean }>();
  readonly itemValue = this.current.asReadonly();
  readonly nodeId = computed(() => {
    const item = this.current();
    return decisionNodeId({ kind: 'item', sourceId: item?.sourceId, itemKey: item?.key });
  });
  readonly form = new FormGroup({
    label: new FormControl('', { nonNullable: true }),
    traceType: new FormControl<'line' | 'bar' | 'area'>('line', { nonNullable: true }),
    axis: new FormControl<'left' | 'right'>('left', { nonNullable: true }),
    visible: new FormControl(true, { nonNullable: true }),
    customColor: new FormControl(false, { nonNullable: true }),
    color: new FormControl('#f26a21', { nonNullable: true }),
    lineStyle: new FormControl<'solid' | 'dashed' | 'dotted'>('solid', { nonNullable: true })
  });
  readonly value = signal(this.form.getRawValue());

  @Input({ required: true }) set item(item: VisualizationDecisionItem) {
    this.current.set(item);
  }

  ngOnChanges(): void {
    const item = this.current(); if (!item) return;
    const identity = `${this.editorKey()}:${item.sourceId}:${item.key}:${this.resetKey()}`;
    const fingerprint = JSON.stringify(item.appearance);
    if (identity !== this.identity || fingerprint !== this.fingerprint) {
      const oldLabel = this.form.controls.label.value;
      const label = item.appearance.label ?? '';
      const keepRaw = identity === this.identity && oldLabel.trim() === label.trim();
      this.form.patchValue({ label: keepRaw ? oldLabel : label, traceType: item.appearance.traceType, axis: item.appearance.axis,
        visible: item.appearance.visible, customColor: item.customColor,
        color: item.appearance.color && /^#[\da-f]{6}$/i.test(item.appearance.color) ? item.appearance.color : '#f26a21',
        lineStyle: item.appearance.lineStyle ?? 'solid' }, { emitEvent: false });
      this.value.set(this.form.getRawValue()); this.identity = identity; this.fingerprint = fingerprint;
    }
  }

  constructor() {
    const controls = this.form.controls;
    controls.label.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(label => this.edit({ label: label.trim() || null }));
    controls.traceType.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(traceType => this.edit({ traceType }));
    controls.axis.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(axis => this.edit({ axis }));
    controls.visible.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(visible => this.edit({ visible }));
    controls.lineStyle.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(lineStyle => this.edit({ lineStyle }));
    controls.customColor.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(custom => this.edit({ color: custom ? controls.color.value : null }));
    controls.color.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(color => {
      if (controls.customColor.value && /^#[\da-f]{6}$/i.test(color)) this.edit({ color });
    });
  }

  choose<T>(control: FormControl<T>, value: T): void {
    if (this.disabled() || control.value === value) return;
    control.markAsDirty(); control.setValue(value);
  }

  private edit(changes: Extract<VisualizationDecisionAction, { kind: 'item-style' }>['changes']): void {
    this.value.set(this.form.getRawValue());
    const item = this.current(); if (!item || this.disabled()) return;
    this.requested.emit({ kind: 'item-style', sourceId: item.sourceId, item: item.identity, changes });
  }
}

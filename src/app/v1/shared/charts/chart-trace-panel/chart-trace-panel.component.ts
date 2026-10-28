import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { InventoryChartTrace } from '../inventory-chart-sheet/inventory-chart-sheet.models';

interface VisibilityControl { readonly control: FormControl<boolean>; readonly subscription: Subscription; }
interface TraceRow {
  readonly trace: InventoryChartTrace;
  readonly ids: readonly string[];
  readonly label: string;
  readonly control: FormControl<boolean>;
  readonly dash: string | null;
}
interface TraceGroup {
  readonly guid: string;
  readonly name: string;
  readonly ids: readonly string[];
  readonly rows: readonly TraceRow[];
  readonly control: FormControl<boolean>;
  readonly indeterminate: boolean;
  readonly visible: number;
  readonly expanded: boolean;
}

@Component({ selector: 'app-chart-trace-panel', standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet, IconComponent],
  templateUrl: './chart-trace-panel.component.html', styleUrls: ['./chart-trace-panel.component.css'] })
export class ChartTracePanelComponent {
  readonly traces = input<readonly InventoryChartTrace[]>([]);
  readonly hiddenGuids = input<readonly string[]>([]);
  readonly collapsedFacilities = input<readonly string[]>([]);
  readonly state = input<'idle' | 'loading' | 'ready' | 'error'>('ready');
  readonly singleSelection = input(false);
  readonly selectedGuid = input('');
  readonly selected = output<string>();
  readonly singleControl = new FormControl('', { nonNullable: true });
  readonly visibilityChanged = output<readonly string[]>();
  readonly collapsedChanged = output<readonly string[]>();
  readonly highlighted = output<string | undefined>();
  readonly allControl = new FormControl(true, { nonNullable: true });
  readonly groups = signal<readonly TraceGroup[]>([]);
  readonly rows = computed(() => this.groups().flatMap(group => group.rows));
  readonly visibleCount = signal(0);
  readonly grouped = signal(false);
  readonly facilityLabel = signal('');
  readonly allIndeterminate = computed(() => this.visibleCount() > 0 && this.visibleCount() < this.traces().length);
  private readonly traceControls = new Map<string, VisibilityControl>();
  private readonly facilityControls = new Map<string, VisibilityControl>();

  constructor() {
    const allSubscription = this.allControl.valueChanges.subscribe(visible => this.setVisible(this.traces().map(trace => trace.id), visible));
    const singleSubscription = this.singleControl.valueChanges.subscribe(guid => this.selected.emit(guid));
    effect(() => this.singleControl.setValue(this.selectedGuid(), { emitEvent: false }));
    inject(DestroyRef).onDestroy(() => {
      allSubscription.unsubscribe();
      singleSubscription.unsubscribe();
      for (const entry of [...this.traceControls.values(), ...this.facilityControls.values()]) entry.subscription.unsubscribe();
    });
    effect(() => {
      const traces = this.traces(), hidden = new Set(this.hiddenGuids()), collapsed = new Set(this.collapsedFacilities());
      untracked(() => this.hydrate(traces, hidden, collapsed));
    });
  }

  private control(map: Map<string, VisibilityControl>, key: string, onChange: (visible: boolean) => void): FormControl<boolean> {
    let entry = map.get(key);
    if (!entry) {
      const control = new FormControl(true, { nonNullable: true });
      entry = { control, subscription: control.valueChanges.subscribe(onChange) };
      map.set(key, entry);
    }
    return entry.control;
  }

  private hydrate(traces: readonly InventoryChartTrace[], hidden: ReadonlySet<string>, collapsed: ReadonlySet<string>): void {
    const grouped = new Map<string, InventoryChartTrace[]>();
    const traceIds = new Set(traces.map(trace => trace.id));
    for (const trace of traces) {
      const guid = trace.facilityGuid ?? '';
      const entries = grouped.get(guid) ?? [];
      entries.push(trace); grouped.set(guid, entries);
    }
    const names = new Map<string, number>();
    for (const entries of grouped.values()) {
      const name = entries[0].facilityName ?? '';
      names.set(name, (names.get(name) ?? 0) + 1);
    }
    const groups = [...grouped].map(([guid, entries]) => {
      const ids = entries.map(trace => trace.id), visible = entries.filter(trace => !hidden.has(trace.id)).length;
      const rawName = entries[0].facilityName ?? 'Traces';
      const name = names.get(rawName)! > 1 && guid ? `${rawName} (${guid})` : rawName;
      const control = this.control(this.facilityControls, guid, value => this.setVisible(this.traces().filter(trace => (trace.facilityGuid ?? '') === guid).map(trace => trace.id), value));
      control.setValue(visible === entries.length, { emitEvent: false });
      const shortNames = new Map<string, number>();
      for (const trace of entries) { const label = trace.shortLabel ?? trace.label; shortNames.set(label, (shortNames.get(label) ?? 0) + 1); }
      const rows = entries.map(trace => {
        const rowControl = this.control(this.traceControls, trace.id, value => this.setVisible([trace.id], value));
        rowControl.setValue(!hidden.has(trace.id), { emitEvent: false });
        const rawLabel = trace.kind === 'facility' ? name : trace.shortLabel ?? trace.label;
        return { trace, ids: [trace.id], label: shortNames.get(rawLabel)! > 1 ? `${rawLabel} (${trace.id})` : rawLabel,
          control: rowControl, dash: Array.isArray(trace.lineStyle) ? trace.lineStyle.join(' ') : trace.lineStyle === 'dashed' ? '6 4' : trace.lineStyle === 'dotted' ? '2 3' : null };
      }).sort((a, b) => a.label.localeCompare(b.label) || a.trace.id.localeCompare(b.trace.id));
      return { guid, name, ids, rows, control, visible, indeterminate: visible > 0 && visible < entries.length, expanded: !collapsed.has(guid) };
    }).sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
    for (const [key, entry] of this.traceControls) if (!traceIds.has(key)) { entry.subscription.unsubscribe(); this.traceControls.delete(key); }
    for (const [key, entry] of this.facilityControls) if (!grouped.has(key)) { entry.subscription.unsubscribe(); this.facilityControls.delete(key); }
    const visible = traces.filter(trace => !hidden.has(trace.id)).length;
    this.groups.set(groups); this.visibleCount.set(visible);
    this.grouped.set(groups.length > 1 && traces.some(trace => trace.kind !== 'facility'));
    this.facilityLabel.set(groups.length === 1 && traces.some(trace => trace.kind !== 'facility' && !!trace.facilityName) ? groups[0].name : '');
    this.allControl.setValue(visible === traces.length && !!traces.length, { emitEvent: false });
  }

  private setVisible(ids: readonly string[], visible: boolean): void {
    const hidden = new Set(this.hiddenGuids());
    for (const id of ids) { if (visible) hidden.delete(id); else hidden.add(id); }
    this.visibilityChanged.emit([...hidden]);
  }

  toggleFacility(guid: string): void {
    const collapsed = new Set(this.collapsedFacilities());
    if (collapsed.has(guid)) collapsed.delete(guid); else collapsed.add(guid);
    this.collapsedChanged.emit([...collapsed]);
  }

  isolate(ids: readonly string[]): void {
    if (this.singleSelection()) { if (ids.length === 1) this.selected.emit(ids[0]); return; }
    const available = this.traces().map(trace => trace.id), target = new Set(ids);
    const visible = available.filter(id => !this.hiddenGuids().includes(id));
    const restoreAll = visible.length === target.size && visible.every(id => target.has(id));
    const hidden = new Set(this.hiddenGuids());
    for (const id of available) { if (restoreAll || target.has(id)) hidden.delete(id); else hidden.add(id); }
    this.visibilityChanged.emit([...hidden]);
  }

  activateName(event: MouseEvent, ids: readonly string[]): void {
    // Keyboard and assistive-technology button activation emits a click with no pointer click count.
    if (this.singleSelection() || event.detail === 0) this.isolate(ids);
  }

  leaveRow(event: MouseEvent | FocusEvent): void {
    const row = event.currentTarget as HTMLElement;
    if ('relatedTarget' in event && event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) return;
    if (event.type === 'mouseleave' && row.contains(document.activeElement)) return;
    this.highlighted.emit(undefined);
  }
}

import { Component, ElementRef, Input, OnChanges, ViewChild, computed, signal } from '@angular/core';
import type { V1EChartsPointClickEvent } from '@app/v1/shared/charts/echarts-chart.directive';
import { facilityEnergyUseRoute, facilityMeterRoute } from '@app/v1/routing/workspace-route';
import type { CompositionModel } from '../composition.models';
import { compositionOption } from '../composition-options';

@Component({ selector: 'app-visualization-composition', standalone: false,
  templateUrl: './composition-chart.component.html', styleUrls: ['./composition-chart.component.css'] })
export class CompositionChartComponent implements OnChanges {
  @Input({ required: true }) model!: CompositionModel;
  @ViewChild('heading') private heading?: ElementRef<HTMLElement>;
  readonly value = signal<CompositionModel | undefined>(undefined);
  readonly rootId = signal('');
  readonly hierarchy = computed(() => ['treemap', 'sunburst'].includes(this.value()?.chart.kind ?? ''));
  readonly nodes = computed(() => this.value()?.nodes ?? []);
  readonly path = computed(() => {
    const result = []; let node = this.nodes().find(node => node.id === this.rootId());
    while (node) { result.unshift(node); node = this.nodes().find(value => value.id === node!.parentId); }
    return result;
  });
  readonly children = computed(() => this.nodes().filter(node => node.parentId === (this.rootId() || undefined)).map(node => ({ ...node,
    branch: this.nodes().some(child => child.parentId === node.id) })));
  readonly hasGeometry = computed(() => {
    const model = this.value(); if (!model) return false;
    if (model.chart.kind === 'sankey') return [...model.evidence.contributions, ...model.evidence.residuals ?? []].some(row => row.observation.state === 'observed' && row.observation.value > 0);
    return (this.hierarchy() ? this.children() : model.nodes).some(node => model.chart.kind === 'breakdown' && model.chart.type === 'bar'
      ? ('values' in model.chart && model.chart.values === 'percent' ? node.percentage !== null : node.amount !== null) : node.amount !== null && node.amount > 0);
  });
  readonly height = computed(() => {
    const model = this.value();
    return model?.chart.kind === 'breakdown' && model.chart.type === 'bar' ? Math.max(400, model.nodes.length * 34 + 100)
      : model?.chart.kind === 'sankey' ? Math.max(480, new Set(model.evidence.contributions.map(row => row.categories.equipment?.id ?? row.categories.group?.id)).size * 28 + 80) : 560;
  });
  readonly option = computed(() => { const model = this.value(); return model && this.hasGeometry() ? compositionOption(model, this.rootId()) : undefined; });
  readonly sourceLinks = computed(() => {
    const result = new Map<string, { label: string; route: string[] }>();
    for (const row of this.value()?.evidence.contributions ?? []) {
      const facility = row.categories.facility, item = row.categories.equipment, meter = row.categories.meter;
      if (!facility || !item && !meter) continue;
      const route = meter ? facilityMeterRoute(facility.id, meter.id) : facilityEnergyUseRoute(facility.id,
        row.categories.group?.id.startsWith('unavailable:') ? 'unavailable' : row.categories.group?.id ?? 'unavailable', item!.id);
      result.set(JSON.stringify(route), { label: `${facility.label} / ${meter?.label ?? item!.label}`, route });
    }
    return [...result.values()];
  });
  ngOnChanges(): void {
    if (this.value()?.identity !== this.model.identity || this.rootId() && !this.model.nodes.some(node => node.id === this.rootId())) this.rootId.set('');
    this.value.set(this.model);
  }
  drill(id: string): void {
    if (id && !this.nodes().some(node => node.parentId === id)) return;
    this.rootId.set(id); this.heading?.nativeElement.focus();
  }
  parent(): void { this.drill(this.nodes().find(node => node.id === this.rootId())?.parentId ?? ''); }
  clicked(event: V1EChartsPointClickEvent): void {
    if (!this.hierarchy() || !event.data || typeof event.data !== 'object' || !('id' in event.data) || typeof event.data.id !== 'string') return;
    this.drill(event.data.id);
  }
  keydown(event: KeyboardEvent): void {
    if (!this.hierarchy()) return;
    if (event.key === 'Backspace' || event.key === 'Home') { event.preventDefault(); event.key === 'Home' ? this.drill('') : this.parent(); }
  }
}

import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { EnergyUseResultsService } from '../energy-use-results.service';
import { energyUseComparisonLegendHeight, energyUseComparisonOption, energyUseFlowOption } from '../energy-use-results-charts';

@Component({ selector: 'app-energy-use-results-graphs', standalone: false,
  templateUrl: './results-graphs.component.html', styleUrls: ['./results-graphs.component.css'] })
export class ResultsGraphsComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  private readonly width = signal(600);
  readonly results = inject(EnergyUseResultsService);
  readonly footprint = computed(() => this.results.context.activeTab() === 'group-footprint');
  readonly title = computed(() => this.footprint() ? 'Group Footprint' : 'Group Summary');
  readonly history = computed(() => !this.footprint() && this.results.history());
  readonly snapshot = this.results.latest;
  readonly option = computed(() => {
    const selected = this.snapshot();
    return this.footprint() && selected ? energyUseFlowOption(selected, this.results.unit())
      : energyUseComparisonOption(this.history() ? this.results.annual() : selected ? [selected] : [], this.results.unit(), this.history(), this.legendHeight());
  });
  readonly positive = computed(() => this.history() ? this.results.annual().some(row => row.total > 0) : (this.snapshot()?.total ?? 0) > 0);
  readonly legendHeight = computed(() => energyUseComparisonLegendHeight(this.results.annual()[0], Math.max(this.width(), this.plotWidth())));
  readonly plotHeight = computed(() => this.history() ? 420 + this.legendHeight() : Math.max(360, this.results.context.items().length * 32 + 100));
  readonly plotWidth = computed(() => this.history() ? Math.max(600, this.results.years().length * 70) : 620);
  readonly partial = computed(() => this.history() ? this.results.annual().some(row => row.partial) : this.snapshot()?.partial);
  readonly readyResults = computed(() => this.results.context.workspace.ready() && !!this.results.context.group()
    && this.results.context.items().length > 0 && this.results.years().length > 0 && !this.results.unavailableCalendar());

  constructor() {
    afterNextRender(() => {
      const updateWidth = () => this.width.set(this.host.nativeElement.clientWidth - 24);
      updateWidth();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(updateWidth);
      observer.observe(this.host.nativeElement);
      this.destroy.onDestroy(() => observer.disconnect());
    });
  }
}

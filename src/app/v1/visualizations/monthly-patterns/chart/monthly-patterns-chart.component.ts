import { Component, computed, input, output } from '@angular/core';
import type { MonthlyPatternsModel } from '../monthly-patterns.presenter';
import { monthlyPatternsOption } from '../monthly-patterns-options';
import { observationText } from '../../time-series/time-series-options';

@Component({ selector: 'app-monthly-patterns-chart', standalone: false, templateUrl: './monthly-patterns-chart.component.html', styleUrl: './monthly-patterns-chart.component.css' })
export class MonthlyPatternsChartComponent {
  readonly model = input.required<MonthlyPatternsModel>();
  readonly visibilityChanged = output<readonly number[]>();
  readonly option = computed(() => monthlyPatternsOption(this.model()));
  readonly hasVisibleYears = computed(() => this.model().years.some(year => year.visible));
  readonly rows = computed(() => this.model().panels.flatMap(panel => panel.years.flatMap(year => year.points.map(point => ({
    key: `${panel.id}:${year.year}:${point.slot}`, panel: panel.label, year: this.model().years.find(item => item.year === year.year)!.label,
    start: point.start, end: point.end, value: observationText(point, panel.unit) })))));
  legendChanged(selected: Readonly<Record<string, boolean>>): void {
    this.visibilityChanged.emit(this.model().years.filter(year => selected[String(year.year)] === false).map(year => year.year));
  }
}

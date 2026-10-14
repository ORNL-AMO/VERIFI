import { Component, computed, input } from '@angular/core';
import type { StatusAttentionSummary } from '@app/v1/status/status.models';

export function statusAttentionDescription(summary: StatusAttentionSummary): string {
  const count = (value: number, noun: string) => `${value} ${noun}${value === 1 ? '' : 's'}`;
  return `${count(summary.total, 'issue')}: ${count(summary.errorCount, 'error')}, ${count(summary.warningCount, 'warning')}`;
}

@Component({
  selector: 'app-status-attention',
  standalone: true,
  templateUrl: './status-attention.component.html',
  styleUrls: ['./status-attention.component.css']
})
export class StatusAttentionComponent {
  readonly summary = input<StatusAttentionSummary>();
  readonly contextLabel = input.required<string>();
  readonly display = input<'count' | 'indicator'>('count');
  readonly description = computed(() => {
    const summary = this.summary();
    return summary ? statusAttentionDescription(summary) : '';
  });
  readonly title = computed(() => `${this.contextLabel()}: ${this.description()}`);
}

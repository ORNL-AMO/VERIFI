import { Injectable, signal } from '@angular/core';
import type { GroupVisualizationPreferences } from './group-visualization.models';

/** One workbench lifetime; never written to the analysis, local storage, or backups. */
@Injectable()
export class GroupVisualizationSession {
  private readonly entries = signal<ReadonlyMap<string, GroupVisualizationPreferences>>(new Map());

  get(key: string): GroupVisualizationPreferences | undefined {
    return this.entries().get(key);
  }

  set(key: string, value: GroupVisualizationPreferences): void {
    this.entries.update(entries => new Map(entries).set(key, value));
  }
}

import { Component, input } from '@angular/core';
import type { InventoryVisualizationSnapshot } from '../inventory.models';

@Component({ selector: 'app-visualization-snapshot', standalone: true,
  templateUrl: './visualization-snapshot.component.html', styleUrls: ['./visualization-snapshot.component.css'] })
export class VisualizationSnapshotComponent {
  readonly snapshot = input.required<InventoryVisualizationSnapshot>();
  readonly detailed = input(false);
  readonly showScope = input(true);
}

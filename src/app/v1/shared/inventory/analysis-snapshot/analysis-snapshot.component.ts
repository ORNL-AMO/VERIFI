import { Component, computed, input, output } from '@angular/core';
import { InventoryAnalysisSnapshot } from '../inventory.models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-analysis-snapshot', standalone: true, imports: [IconComponent],
  templateUrl: './analysis-snapshot.component.html', styleUrls: ['./analysis-snapshot.component.css', '../inventory-attention.css']
})
export class AnalysisSnapshotComponent {
  readonly snapshot = input.required<InventoryAnalysisSnapshot>();
  readonly detailed = input(false);
  readonly print = input(false);
  readonly visibleRoster = computed(() => this.snapshot().roster.slice(0, 3));
  readonly visibleFindings = computed(() => this.snapshot().findings.slice(0, 2));
  readonly selectionPercent = computed(() => {
    const progress = this.snapshot().selectionProgress;
    return progress && progress.total > 0 ? Math.max(0, Math.min(100, progress.valid / progress.total * 100)) : 0;
  });
  readonly detailsRequested = output<void>();
}

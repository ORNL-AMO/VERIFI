import { Component, computed, input } from '@angular/core';
import { InventoryReportSnapshot } from '../inventory.models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({ selector: 'app-report-snapshot', standalone: true, imports: [IconComponent],
  templateUrl: './report-snapshot.component.html', styleUrls: ['./report-snapshot.component.css', '../inventory-attention.css'] })
export class ReportSnapshotComponent {
  readonly snapshot = input.required<InventoryReportSnapshot>();
  readonly detailed = input(false);
  readonly visibleFindings = computed(() => this.snapshot().findings.slice(0, 2));
}

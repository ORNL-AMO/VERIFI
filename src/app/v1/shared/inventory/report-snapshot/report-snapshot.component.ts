import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryReportSnapshot } from '../inventory.models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({ selector: 'app-report-snapshot', standalone: true, imports: [IconComponent],
  templateUrl: './report-snapshot.component.html', styleUrls: ['./report-snapshot.component.css', '../inventory-attention.css'] })
export class ReportSnapshotComponent {
  private readonly router = inject(Router);
  readonly snapshot = input.required<InventoryReportSnapshot>();
  readonly detailed = input(false);
  readonly resourceName = input('report');
  readonly navigationRequested = output<readonly string[]>();
  readonly visibleFindings = computed(() => this.snapshot().findings.slice(0, 2).map(finding => ({ ...finding,
    href: finding.action ? this.router.serializeUrl(this.router.createUrlTree([...finding.action.route])) : undefined })));
  open(event: MouseEvent, route: readonly string[]): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); this.navigationRequested.emit(route);
  }
}

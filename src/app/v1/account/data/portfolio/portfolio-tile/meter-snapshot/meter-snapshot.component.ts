import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PortfolioMeterSnapshot } from '../../portfolio-inventory.models';

@Component({ selector: 'app-meter-snapshot', standalone: false,
  templateUrl: './meter-snapshot.component.html', styleUrls: ['./meter-snapshot.component.css'] })
export class MeterSnapshotComponent {
  private readonly router = inject(Router);
  @Input({ required: true }) snapshot!: PortfolioMeterSnapshot;
  @Input({ required: true }) meterName!: string;
  @Input() detailed = false;
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
  readingsHref = '';
  findings: readonly (PortfolioMeterSnapshot['findings'][number] & { readonly href: string })[] = [];

  ngOnChanges(): void {
    const href = (route: readonly string[]) => this.router.serializeUrl(this.router.createUrlTree([...route]));
    this.readingsHref = href(this.snapshot.readingsLink.route);
    this.findings = this.snapshot.findings.map(finding => ({ ...finding, href: finding.action ? href(finding.action.route) : '' }));
  }
  open(event: MouseEvent, route: readonly string[]): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); this.navigationRequested.emit(route);
  }
}

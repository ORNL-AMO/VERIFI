import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryReadingSnapshot } from '../inventory.models';

@Component({ selector: 'app-reading-snapshot', standalone: true, imports: [IconComponent],
  templateUrl: './reading-snapshot.component.html', styleUrls: ['./reading-snapshot.component.css'] })
export class ReadingSnapshotComponent {
  private readonly router = inject(Router);
  @Input({ required: true }) snapshot!: InventoryReadingSnapshot;
  @Input({ required: true }) resourceName!: string;
  @Input() detailed = false;
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
  readingsHref = '';
  findings: readonly (InventoryReadingSnapshot['findings'][number] & { readonly href: string })[] = [];

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

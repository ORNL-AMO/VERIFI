import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FacilityInventoryDestination, InventoryFacilitySnapshot, InventoryResourceSummary } from '../inventory.models';

interface ResourceLink extends InventoryResourceSummary {
  readonly href: string;
  readonly description: string;
  readonly note: string;
}

@Component({ selector: 'app-facility-snapshot', standalone: true, imports: [IconComponent],
  templateUrl: './facility-snapshot.component.html', styleUrls: ['./facility-snapshot.component.css'] })
export class FacilitySnapshotComponent {
  private readonly router = inject(Router);
  @Input({ required: true }) snapshot!: InventoryFacilitySnapshot;
  @Input({ required: true }) facilityName!: string;
  @Input() detailed = false;
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
  @Output() readonly facilityInventoryRequested = new EventEmitter<FacilityInventoryDestination>();
  resources: readonly ResourceLink[] = [];
  findings: readonly (InventoryFacilitySnapshot['findings'][number] & { readonly href: string })[] = [];

  ngOnChanges(): void {
    const href = (route: readonly string[]) => this.router.serializeUrl(this.router.createUrlTree([...route]));
    const state = this.snapshot.evaluation;
    this.resources = this.snapshot.resources.map(resource => {
      const counts = `${resource.errorCount} with errors, ${resource.warningCount} with warnings, ${resource.validCount} with all data valid`;
      const evaluation = state === 'ready' ? counts : state === 'error' ? 'Checks unavailable' : 'Checks pending';
      return { ...resource, href: this.router.serializeUrl(this.router.createUrlTree([...resource.route], { queryParams: resource.queryParams })), description: `${resource.total} ${resource.label.toLowerCase()} for ${this.facilityName}. ${evaluation}.`,
        note: !resource.total ? `No ${resource.label.toLowerCase()} yet` : state === 'ready' ? `${resource.errorCount + resource.warningCount} need attention` : evaluation };
    });
    this.findings = this.snapshot.findings.map(finding => ({ ...finding, href: finding.action ? href(finding.action.route) : '' }));
  }
  openResource(event: MouseEvent, resource: InventoryResourceSummary): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); this.facilityInventoryRequested.emit({ facilityGuid: resource.facilityGuid, resource: resource.kind });
  }
  open(event: MouseEvent, route: readonly string[]): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); this.navigationRequested.emit(route);
  }
}

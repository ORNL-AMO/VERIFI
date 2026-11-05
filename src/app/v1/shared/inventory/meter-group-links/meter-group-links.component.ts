import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { InventoryMeterGroupLink } from '../inventory.models';

@Component({ selector: 'app-inventory-meter-group-links', standalone: false,
  templateUrl: './meter-group-links.component.html', styleUrls: ['./meter-group-links.component.css'] })
export class MeterGroupLinksComponent {
  private readonly router = inject(Router);
  @Input() groups?: readonly InventoryMeterGroupLink[];
  @Input() browseId = '';
  @Input() print = false;
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
  links: readonly (InventoryMeterGroupLink & { readonly href?: string })[] = [];
  ngOnChanges(): void {
    this.links = (this.groups ?? []).map(group => ({ ...group,
      href: group.route ? this.router.serializeUrl(this.router.createUrlTree([...group.route])) : undefined }));
  }
  open(event: MouseEvent, route: readonly string[]): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); this.navigationRequested.emit(route);
  }
}

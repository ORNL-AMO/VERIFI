import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { InventoryEnergyUseGroupSnapshot } from '../inventory.models';

@Component({ selector: 'app-energy-use-group-snapshot', standalone: false,
  templateUrl: './energy-use-group-snapshot.component.html',
  styleUrls: ['./energy-use-group-snapshot.component.css'] })
export class EnergyUseGroupSnapshotComponent {
  private readonly router = inject(Router);
  @Input({ required: true }) snapshot!: InventoryEnergyUseGroupSnapshot;
  @Input() detailed = false;
  @Input() print = false;
  @Input() groupName = 'energy-use group';
  @Input() browseId = '';
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
  items: readonly (InventoryEnergyUseGroupSnapshot['items'][number] & { readonly href: string })[] = [];

  ngOnChanges(): void {
    this.items = this.snapshot.items.map(item => ({ ...item,
      href: this.router.serializeUrl(this.router.createUrlTree([...item.route])) }));
  }
  open(event: MouseEvent, route: readonly string[]): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); this.navigationRequested.emit(route);
  }
}

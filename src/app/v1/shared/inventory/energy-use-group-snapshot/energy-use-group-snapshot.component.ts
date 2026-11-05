import { Component, Input } from '@angular/core';
import type { InventoryEnergyUseGroupSnapshot } from '../inventory.models';

@Component({ selector: 'app-energy-use-group-snapshot', standalone: false,
  templateUrl: './energy-use-group-snapshot.component.html',
  styleUrls: ['./energy-use-group-snapshot.component.css'] })
export class EnergyUseGroupSnapshotComponent {
  @Input({ required: true }) snapshot!: InventoryEnergyUseGroupSnapshot;
  @Input() detailed = false;
}

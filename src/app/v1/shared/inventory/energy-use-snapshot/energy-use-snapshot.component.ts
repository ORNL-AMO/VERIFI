import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { InventoryEnergyUseSnapshot } from '../inventory.models';

@Component({
  selector: 'app-energy-use-snapshot',
  templateUrl: './energy-use-snapshot.component.html',
  styleUrls: ['./energy-use-snapshot.component.css'],
  standalone: false
})
export class EnergyUseSnapshotComponent {
  @Input({ required: true }) snapshot!: InventoryEnergyUseSnapshot;
  @Input() detailed = false;
  @Input() print = false;
  @Input() browseId = '';
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
}

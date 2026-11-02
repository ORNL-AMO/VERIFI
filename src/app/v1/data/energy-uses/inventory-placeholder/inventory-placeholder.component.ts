import { Component, Input } from '@angular/core';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

@Component({
  selector: 'app-inventory-placeholder',
  templateUrl: './inventory-placeholder.component.html',
  styleUrls: ['./inventory-placeholder.component.css'],
  standalone: false
})
export class InventoryPlaceholderComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) icon!: IconName;
}

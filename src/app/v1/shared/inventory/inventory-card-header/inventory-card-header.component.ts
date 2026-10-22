import { Component, input } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-inventory-card-header', standalone: true,
  imports: [IconComponent],
  host: { class: 'portfolio-tile__scope', '[class.portfolio-tile__analysis-scope]': "resource() === 'analysis'", '[attr.data-scope]': 'scope()' },
  templateUrl: './inventory-card-header.component.html', styleUrls: ['./inventory-card-header.component.css']
})
export class InventoryCardHeaderComponent {
  readonly resource = input<'analysis' | 'report'>('analysis');
  readonly scope = input.required<'account' | 'facility'>();
}

import { Component, input } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AnalysisLinkedItem } from './analysis-linked-items.models';

@Component({
  selector: 'app-analysis-linked-items', standalone: true, imports: [IconComponent],
  templateUrl: './analysis-linked-items.component.html', styleUrls: ['./analysis-linked-items.component.css']
})
export class AnalysisLinkedItemsComponent {
  readonly items = input.required<readonly AnalysisLinkedItem[]>();
  readonly label = input('Linked items');
  readonly emptyMessage = input('No linked items.');
}

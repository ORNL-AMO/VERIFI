import { Component, Input } from '@angular/core';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-data-empty-state',
  templateUrl: './data-empty-state.component.html',
  styleUrls: ['./data-empty-state.component.css'],
  host: {
    role: 'status'
  },
  imports: [IconComponent],
  standalone: true
})
export class DataEmptyStateComponent {
  @Input({ required: true }) icon!: IconName;
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input() context: 'account' | 'facility' = 'account';
}

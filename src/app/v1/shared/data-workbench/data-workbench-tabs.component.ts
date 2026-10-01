import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { StatusAttentionSummary } from '@app/v1/status/status.models';

export interface DataWorkbenchTab {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
}

@Component({
  selector: 'app-data-workbench-tabs',
  templateUrl: './data-workbench-tabs.component.html',
  styleUrls: ['./data-workbench-tabs.component.css'],
  standalone: true,
  imports: [IconComponent]
})
export class DataWorkbenchTabsComponent {
  @Input({ required: true }) tabs: ReadonlyArray<DataWorkbenchTab> = [];
  @Input({ required: true }) activeTab = '';
  @Input({ required: true }) ariaLabel = 'Workbench sections';
  @Input() attention: Readonly<Record<string, StatusAttentionSummary | undefined>> = {};
  @Input() attentionDisplay: 'count' | 'indicator' = 'count';
  @Output() readonly tabSelected = new EventEmitter<string>();
}

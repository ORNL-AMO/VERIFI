import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { StatusAttentionSummary } from '@app/v1/status/status.models';

export interface PredictorWorkbenchDisplayTab {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
}

@Component({
  selector: 'app-predictor-workbench-tabs',
  templateUrl: './predictor-workbench-tabs.component.html',
  styleUrls: ['./predictor-workbench-tabs.component.css'],
  standalone: true,
  imports: [IconComponent]
})
export class PredictorWorkbenchTabsComponent {
  @Input({ required: true }) tabs: ReadonlyArray<PredictorWorkbenchDisplayTab> = [];
  @Input({ required: true }) activeTab = 'settings';
  @Input() attention: Readonly<Record<string, StatusAttentionSummary | undefined>> = {};
  @Output() readonly tabSelected = new EventEmitter<string>();
}

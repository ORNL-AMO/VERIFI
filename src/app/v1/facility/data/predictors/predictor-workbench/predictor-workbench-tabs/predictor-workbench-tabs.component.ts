import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { PredictorWorkbenchTab, PredictorWorkbenchTabAttention, PredictorWorkbenchTabId } from '../../models';

@Component({
  selector: 'app-predictor-workbench-tabs',
  templateUrl: './predictor-workbench-tabs.component.html',
  styleUrls: ['./predictor-workbench-tabs.component.css'],
  standalone: true,
  imports: [IconComponent]
})
export class PredictorWorkbenchTabsComponent {
  @Input({ required: true }) tabs: ReadonlyArray<PredictorWorkbenchTab> = [];
  @Input({ required: true }) activeTab: PredictorWorkbenchTabId = 'settings';
  @Input() attention: PredictorWorkbenchTabAttention = {};
  @Output() readonly tabSelected = new EventEmitter<PredictorWorkbenchTabId>();
}

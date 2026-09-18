import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterWorkbenchTab, MeterWorkbenchTabAttention, MeterWorkbenchTabId } from '@app/v1/facility/data/meters/models';

@Component({
  selector: 'app-meter-workbench-tabs',
  templateUrl: './meter-workbench-tabs.component.html',
  styleUrls: ['./meter-workbench-tabs.component.css'],
  standalone: false
})
export class MeterWorkbenchTabsComponent {
  @Input({ required: true }) tabs: ReadonlyArray<MeterWorkbenchTab> = [];
  @Input({ required: true }) activeTab: MeterWorkbenchTabId = 'settings';
  @Input() attention: MeterWorkbenchTabAttention = {};
  @Output() tabSelected = new EventEmitter<MeterWorkbenchTabId>();

  selectTab(tabId: MeterWorkbenchTabId): void {
    this.tabSelected.emit(tabId);
  }
}

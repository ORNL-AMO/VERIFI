import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterWorkbenchTab, MeterWorkbenchTabId } from '@app/v1/facility/data/meters/facility-meters.models';

@Component({
  selector: 'app-meter-workbench-tabs',
  templateUrl: './meter-workbench-tabs.component.html',
  standalone: false
})
export class MeterWorkbenchTabsComponent {
  @Input({ required: true }) tabs: ReadonlyArray<MeterWorkbenchTab> = [];
  @Input({ required: true }) activeTab: MeterWorkbenchTabId = 'settings';
  @Output() tabSelected = new EventEmitter<MeterWorkbenchTabId>();

  selectTab(tabId: MeterWorkbenchTabId): void {
    this.tabSelected.emit(tabId);
  }
}

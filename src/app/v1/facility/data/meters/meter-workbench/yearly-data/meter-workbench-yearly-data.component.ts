import { Component } from '@angular/core';
import { meterWorkbenchTab } from '../../facility-meters.models';

@Component({
  selector: 'app-meter-workbench-yearly-data',
  templateUrl: '../meter-workbench-tab-placeholder.component.html',
  styleUrls: ['../meter-workbench-tab-placeholder.component.css'],
  standalone: false
})
export class MeterWorkbenchYearlyDataComponent {
  readonly tab = meterWorkbenchTab('yearly');
}

import { Component } from '@angular/core';
import { meterWorkbenchTab } from '../../facility-meters.models';

@Component({
  selector: 'app-meter-workbench-monthly-data',
  templateUrl: '../meter-workbench-tab-placeholder.component.html',
  styleUrls: ['../meter-workbench-tab-placeholder.component.css'],
  standalone: false
})
export class MeterWorkbenchMonthlyDataComponent {
  readonly tab = meterWorkbenchTab('monthly');
}

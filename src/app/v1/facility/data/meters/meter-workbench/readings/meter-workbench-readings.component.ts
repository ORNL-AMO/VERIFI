import { Component } from '@angular/core';
import { meterWorkbenchTab } from '../../facility-meters.models';

@Component({
  selector: 'app-meter-workbench-readings',
  templateUrl: '../meter-workbench-tab-placeholder.component.html',
  styleUrls: ['../meter-workbench-tab-placeholder.component.css'],
  standalone: false
})
export class MeterWorkbenchReadingsComponent {
  readonly tab = meterWorkbenchTab('readings');
}

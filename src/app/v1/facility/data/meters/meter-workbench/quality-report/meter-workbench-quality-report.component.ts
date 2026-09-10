import { Component } from '@angular/core';
import { meterWorkbenchTab } from '../../facility-meters.models';

@Component({
  selector: 'app-meter-workbench-quality-report',
  templateUrl: '../meter-workbench-tab-placeholder.component.html',
  styleUrls: ['../meter-workbench-tab-placeholder.component.css'],
  standalone: false
})
export class MeterWorkbenchQualityReportComponent {
  readonly tab = meterWorkbenchTab('quality');
}

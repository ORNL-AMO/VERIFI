import { Component, Input } from '@angular/core';
import { BillInspectionChargeView } from '../meter-workbench-bill-inspection.models';

@Component({
  selector: 'app-bill-inspection-charge-section',
  templateUrl: './bill-inspection-charge-section.component.html',
  styleUrls: ['../meter-workbench-bill-inspection.component.css'],
  host: { role: 'region' },
  standalone: false
})
export class BillInspectionChargeSectionComponent {
  @Input({ required: true }) chargeView!: BillInspectionChargeView;
}

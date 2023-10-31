import { Component, Input } from '@angular/core';
import { FuelTypeOption } from '../editMeterOptions';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-emissions-details-table',
  templateUrl: './emissions-details-table.component.html',
  styleUrls: ['./emissions-details-table.component.css']
})
export class EmissionsDetailsTableComponent {
  @Input()
  selectedFuelTypeOption: FuelTypeOption;
  @Input()
  meterForm: FormGroup;
  
}

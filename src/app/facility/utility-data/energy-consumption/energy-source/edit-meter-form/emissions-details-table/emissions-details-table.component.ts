import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';

@Component({
    selector: 'app-emissions-details-table',
    templateUrl: './emissions-details-table.component.html',
    styleUrls: ['./emissions-details-table.component.css'],
    standalone: false
})
export class EmissionsDetailsTableComponent {
  @Input({required: true})
  selectedFuelTypeOption: FuelTypeOption;
  @Input({required: true})
  meterForm: FormGroup;
  
}

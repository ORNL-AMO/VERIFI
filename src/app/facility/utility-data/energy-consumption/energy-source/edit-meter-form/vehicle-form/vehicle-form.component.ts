import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-vehicle-form',
  templateUrl: './vehicle-form.component.html',
  styleUrls: ['./vehicle-form.component.css']
})
export class VehicleFormComponent {
  @Input()
  meterForm: FormGroup;

  vehicleCategories: Array<any> = [];
  vehicleTypes: Array<any> = [];
  vehicleCollectionTypes: Array<any> = [];
  collectionUnitOptions: Array<any> = [];
  fuelOptions: Array<any> = [];
  constructor() {

  }

  changeCategory() {

  }

  changeType() {

  }

  changeCollectionType() {

  }

  changeCollectionUnit() {

  }

  changeFuel() {

  }
}

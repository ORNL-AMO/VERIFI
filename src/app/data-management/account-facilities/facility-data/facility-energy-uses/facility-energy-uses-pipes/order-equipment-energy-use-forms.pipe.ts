import { Pipe, PipeTransform } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Pipe({
  name: 'orderEquipmentEnergyUseForms',
  standalone: false,
  pure: false
})
export class OrderEquipmentEnergyUseFormsPipe implements PipeTransform {

  transform(forms: Array<FormGroup>): Array<FormGroup> {
    return forms.sort((a, b) => a.controls['year'].value - b.controls['year'].value);
  }

}

import { Pipe, PipeTransform } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Pipe({
  name: 'energyUseSourceFormGroup',
  standalone: false,
})
export class EnergyUseSourceFormGroupPipe implements PipeTransform {

  transform(form: FormGroup, includedSource: { controlName: string }): FormGroup {
    return form.get('utilityData_' + includedSource.controlName) as FormGroup;
  }

}

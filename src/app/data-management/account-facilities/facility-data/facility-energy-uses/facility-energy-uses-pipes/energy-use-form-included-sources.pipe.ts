import { Pipe, PipeTransform } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { getIncludedSources } from '../calculations/facilityEnergyUse';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'energyUseFormIncludedSources',
  standalone: false,
})
export class EnergyUseFormIncludedSourcesPipe implements PipeTransform {

  transform(form: FormGroup): Array<{
    source: MeterSource, controlName: string
  }> {
    return getIncludedSources(form);
  }

}

import { Pipe, PipeTransform } from '@angular/core';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { UtilityDataForm } from '../facility-energy-use-equipment-form/facility-energy-use-equipment-form.service';

@Pipe({
  name: 'energyUseFormIncludedSources',
  standalone: false,
})
export class EnergyUseFormIncludedSourcesPipe implements PipeTransform {

  transform(utilityDataForms: Array<UtilityDataForm>): Array<MeterSource> {
    let sources: Array<MeterSource> = utilityDataForms.map(form => { return form.energySource });
    return sources;
  }

}

import { Pipe, PipeTransform } from '@angular/core';
import { MeterSource } from '@data/models/constantsAndTypes';
import { UtilityDataForm } from '@v0/data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-use-equipment-form/facility-energy-use-equipment-form.service';

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

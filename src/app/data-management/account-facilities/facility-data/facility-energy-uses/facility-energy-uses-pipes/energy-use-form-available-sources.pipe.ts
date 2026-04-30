import { Pipe, PipeTransform } from '@angular/core';
import { EnergySources, MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'energyUseFormAvailableSources',
  standalone: false,
})
export class EnergyUseFormAvailableSourcesPipe implements PipeTransform {

  transform(includedSources: Array<MeterSource>): Array<MeterSource> {
    return EnergySources.filter(source => {
      return !includedSources.includes(source);
    });
  }

}

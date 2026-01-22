import { Pipe, PipeTransform } from '@angular/core';
import { EnergySources, MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'energyUseFormAvailableSources',
  standalone: false,
})
export class EnergyUseFormAvailableSourcesPipe implements PipeTransform {

  transform(includedSources: Array<{ source: MeterSource }>): Array<MeterSource> {
    let selectedSources: Array<MeterSource> = includedSources.map(sourceObj => { return sourceObj.source; });
    return EnergySources.filter(source => {
      return !selectedSources.includes(source);
    });
  }

}

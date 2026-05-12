import { Pipe, PipeTransform } from '@angular/core';
import { EnergyEquipmentOperatingConditionsData } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Pipe({
  name: 'yearOptionsFilter',
  standalone: false,
  pure: false
})
export class YearOptionsFilterPipe implements PipeTransform {

  transform(yearOptions: Array<{ year: number, selected: boolean }>, energyUseData: Array<EnergyEquipmentOperatingConditionsData>, selectedYear: number): Array<{ year: number }> {
    let inUseYears: Array<number> = energyUseData.map(data => data.year);
    let filteredYears: Array<{ year: number }> = yearOptions.filter(option => {
      return !inUseYears.includes(option.year) || option.year === selectedYear;
    })
    return filteredYears;
  }

}

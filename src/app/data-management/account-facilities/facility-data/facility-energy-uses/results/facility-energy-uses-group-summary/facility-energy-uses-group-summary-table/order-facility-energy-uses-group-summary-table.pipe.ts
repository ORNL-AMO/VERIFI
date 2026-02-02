import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';
import { EnergyUsesGroupSummary } from 'src/app/calculations/energy-footprint/energyUsesGroupSummary';
@Pipe({
  name: 'orderFacilityEnergyUsesGroupSummaryTable',
  standalone: false,
})
export class OrderFacilityEnergyUsesGroupSummaryTablePipe implements PipeTransform {

  transform(energyUsesGroupSummary: EnergyUsesGroupSummary, year: number, orderByField: string, orderByDir: 'asc' | 'desc'): EnergyUsesGroupSummary {
    if (energyUsesGroupSummary && energyUsesGroupSummary.equipmentAnnualEnergyUse) {
      if (orderByField != 'equipmentName') {
        energyUsesGroupSummary.equipmentAnnualEnergyUse = _.orderBy(energyUsesGroupSummary.equipmentAnnualEnergyUse, [(equip) => {
          let yearData = equip.annualEnergyUse.find(annualUse => annualUse.year == year);
          if (yearData) {
            if (orderByField == 'energyUse') {
              return yearData.energyUse;
            } else if (orderByField == 'percentOfTotal') {
              return yearData.percentOfTotal;
            }
          }
          return 0;
        }], [orderByDir]);
      } else {
        energyUsesGroupSummary.equipmentAnnualEnergyUse = _.orderBy(energyUsesGroupSummary.equipmentAnnualEnergyUse, ['equipmentName'], [orderByDir]);
      }
    }
    return energyUsesGroupSummary;
  }

}

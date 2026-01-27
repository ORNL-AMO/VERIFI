import { Pipe, PipeTransform } from '@angular/core';
import { EnergyFootprintGroup } from 'src/app/calculations/energy-footprint/energyFootprintGroup';
import * as _ from 'lodash';
@Pipe({
  name: 'orderFacilityEnergyUsesGroupSummaryTable',
  standalone: false,
})
export class OrderFacilityEnergyUsesGroupSummaryTablePipe implements PipeTransform {

  transform(energyFootprintGroup: EnergyFootprintGroup, year: number, orderByField: string, orderByDir: 'asc' | 'desc'): EnergyFootprintGroup {
    if (energyFootprintGroup && energyFootprintGroup.equipmentAnnualEnergyUse) {
      if (orderByField != 'equipmentName') {
        energyFootprintGroup.equipmentAnnualEnergyUse = _.orderBy(energyFootprintGroup.equipmentAnnualEnergyUse, [(equip) => {
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
        energyFootprintGroup.equipmentAnnualEnergyUse = _.orderBy(energyFootprintGroup.equipmentAnnualEnergyUse, ['equipmentName'], [orderByDir]);
      }
    }
    return energyFootprintGroup;
  }

}

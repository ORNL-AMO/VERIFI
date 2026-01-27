import { Pipe, PipeTransform } from '@angular/core';
import { EnergyFootprintFacility } from 'src/app/calculations/energy-footprint/energyFootprintFacility';
import * as _ from 'lodash';
@Pipe({
  name: 'orderFacilityEnergyUsesSummaryTable',
  standalone: false,
})
export class OrderFacilityEnergyUsesSummaryTablePipe implements PipeTransform {

  transform(energyFootprintFacility: EnergyFootprintFacility, year: number, orderByField: string, orderByDir: 'asc' | 'desc'): EnergyFootprintFacility {
    if (energyFootprintFacility && energyFootprintFacility.footprintGroupSummaries) {
      if (orderByField != 'groupName') {
        energyFootprintFacility.footprintGroupSummaries = _.orderBy(energyFootprintFacility.footprintGroupSummaries, [(group) => {
          let yearData = group.annualEnergyUse.find(annualUse => annualUse.year == year);
          if (yearData) {
            if (orderByField == 'totalEnergyUse') {
              return yearData.totalEnergyUse;
            } else if (orderByField == 'percentOfFacilityUse') {
              return yearData.percentOfFacilityUse;
            }
          }
          return 0;
        }], [orderByDir]);
        return energyFootprintFacility;
      } else {
        energyFootprintFacility.footprintGroupSummaries = _.orderBy(energyFootprintFacility.footprintGroupSummaries, ['groupName'], [orderByDir]);
      }
    }
    return energyFootprintFacility;
  }

}

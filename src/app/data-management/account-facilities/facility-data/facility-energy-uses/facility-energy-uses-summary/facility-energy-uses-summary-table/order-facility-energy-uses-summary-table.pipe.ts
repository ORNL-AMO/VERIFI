import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';
import { EnergyUsesFacilitySummary } from 'src/app/calculations/energy-footprint/energyUsesFacilitySummary';
@Pipe({
  name: 'orderFacilityEnergyUsesSummaryTable',
  standalone: false,
})
export class OrderFacilityEnergyUsesSummaryTablePipe implements PipeTransform {

  transform(energyUsesFacilitySummary: EnergyUsesFacilitySummary, year: number, orderByField: string, orderByDir: 'asc' | 'desc'): EnergyUsesFacilitySummary {
    if (energyUsesFacilitySummary && energyUsesFacilitySummary.footprintGroupSummaries) {
      if (orderByField != 'groupName') {
        energyUsesFacilitySummary.footprintGroupSummaries = _.orderBy(energyUsesFacilitySummary.footprintGroupSummaries, [(group) => {
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
        return energyUsesFacilitySummary;
      } else {
        energyUsesFacilitySummary.footprintGroupSummaries = _.orderBy(energyUsesFacilitySummary.footprintGroupSummaries, ['groupName'], [orderByDir]);
      }
    }
    return energyUsesFacilitySummary;
  }

}

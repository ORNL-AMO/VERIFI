import { Pipe, PipeTransform } from '@angular/core';
import { AnnualFootprintGroupSourceResult, FootprintEquipmentAnnualResult, FootprintGroupMeterGroupAnnualResult } from 'src/app/calculations/energy-footprint/energyFootprintModels';
import * as _ from 'lodash';
@Pipe({
  name: 'orderFacilityEnergyUsesGroupFootprintTableByMeterGroup',
  standalone: false,
})
export class OrderFacilityEnergyUsesGroupFootprintTableByMeterGroupPipe implements PipeTransform {

  transform(meterGroupsAnnualResults: Array<FootprintGroupMeterGroupAnnualResult>, orderByField: string, orderByYear: number, orderByDir: 'asc' | 'desc'): Array<FootprintGroupMeterGroupAnnualResult> {
    if (orderByField != 'name') {
      meterGroupsAnnualResults = _.orderBy(meterGroupsAnnualResults, (equip: { annualResults: Array<AnnualFootprintGroupSourceResult> }) => {
        let yearData = equip.annualResults.find(annualUse => annualUse.year == orderByYear);
        if (yearData) {
          if (orderByField == 'energyUse') {
            return yearData.energyUse;
          } else if (orderByField == 'totalEnergyUse') {
            return yearData.totalEnergyUse;
          } else if (orderByField == 'percentOfTotal') {
            return yearData.percentOfTotal;
          }
        }
        return 0;
      }, [orderByDir]);

      meterGroupsAnnualResults.forEach(groupResult => {
        groupResult.equipmentAnnualResults = _.orderBy(groupResult.equipmentAnnualResults, (equipResult: FootprintEquipmentAnnualResult) => {
          let yearData = equipResult.annualResults.find(annualUse => annualUse.year == orderByYear);
          if (yearData) {
            if (orderByField == 'energyUse') {
              return yearData.energyUse;
            } else if (orderByField == 'totalEnergyUse') {
              return yearData.totalEnergyUse;
            } else if (orderByField == 'percentOfTotal') {
              return yearData.percentOfTotal;
            }
          }
        }, [orderByDir]);
      });

    } else {
      meterGroupsAnnualResults = _.orderBy(meterGroupsAnnualResults, ['meterGroupName'], [orderByDir]);
      meterGroupsAnnualResults.forEach(groupResult => {
        groupResult.equipmentAnnualResults = _.orderBy(groupResult.equipmentAnnualResults, (equipmentResult: FootprintEquipmentAnnualResult) => {
          return equipmentResult.equipmentName;
        }, [orderByDir]);
      });
    }
    return meterGroupsAnnualResults;
  }

}

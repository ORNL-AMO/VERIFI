import { Pipe, PipeTransform } from '@angular/core';
import { AnnualFootprintGroupSourceResult, FootprintAnnualResult, MeterGroupAnnualResult } from 'src/app/calculations/energy-footprint/energyFootprintModels';
import * as _ from 'lodash';
@Pipe({
  name: 'orderFacilityEnergyUsesFootprintTableByMeterGroup',
  standalone: false
})
export class OrderFacilityEnergyUsesFootprintTableByMeterGroupPipe implements PipeTransform {

  transform(meterGroupsAnnualResults: Array<MeterGroupAnnualResult>, orderByField: string, orderByYear: number, orderByDir: 'asc' | 'desc'): Array<MeterGroupAnnualResult> {
    if (orderByField != 'name') {
      meterGroupsAnnualResults = _.orderBy(meterGroupsAnnualResults, (meterGroup: { annualResults: Array<AnnualFootprintGroupSourceResult> }) => {
        let yearData = meterGroup.annualResults.find(annualUse => annualUse.year == orderByYear);
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

      meterGroupsAnnualResults.forEach(meterGroupResult => {
        meterGroupResult.energyUseGroupAnnualResults = _.orderBy(meterGroupResult.energyUseGroupAnnualResults, (group: { annualResults: Array<FootprintAnnualResult> }) => {
          let yearData = group.annualResults.find(annualUse => annualUse.year == orderByYear);
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
      });
    } else {
      meterGroupsAnnualResults = _.orderBy(meterGroupsAnnualResults, ['meterGroupName'], [orderByDir]);
      meterGroupsAnnualResults.forEach(meterGroupResult => {
        meterGroupResult.energyUseGroupAnnualResults = _.orderBy(meterGroupResult.energyUseGroupAnnualResults, (group: { groupName: string }) => {
          return group.groupName;
        }, [orderByDir]);
      });
    }

    return meterGroupsAnnualResults;
  }

}

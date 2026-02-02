import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';
import { AnnualFootprintGroupSourceResult, FootprintAnnualResult, IncludedSourcesAnnualResult } from 'src/app/calculations/energy-footprint/energyFootprintModels';

@Pipe({
  name: 'orderFacilityEnergyUsesFootprintTableBySource',
  standalone: false,
})
export class OrderFacilityEnergyUsesFootprintTableBySourcePipe implements PipeTransform {

  transform(includedSourcesAnnualResults: Array<IncludedSourcesAnnualResult>, orderByField: string, orderByYear: number, orderByDir: 'asc' | 'desc'): Array<IncludedSourcesAnnualResult> {
    if (orderByField != 'name') {
      includedSourcesAnnualResults = _.orderBy(includedSourcesAnnualResults, (equip: { annualTotals: Array<FootprintAnnualResult> }) => {
        let yearData = equip.annualTotals.find(annualUse => annualUse.year == orderByYear);
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

      includedSourcesAnnualResults.forEach(sourceResult => {
        sourceResult.groupResults = _.orderBy(sourceResult.groupResults, (group: { annualSourceResults: Array<AnnualFootprintGroupSourceResult> }) => {
          let yearData = group.annualSourceResults.find(annualUse => annualUse.year == orderByYear);
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
      includedSourcesAnnualResults = _.orderBy(includedSourcesAnnualResults, ['source'], [orderByDir]);
      includedSourcesAnnualResults.forEach(sourceResult => {
        sourceResult.groupResults = _.orderBy(sourceResult.groupResults, (group: { groupName: string }) => {
          return group.groupName;
        }, [orderByDir]);
      });
    }
    return includedSourcesAnnualResults;
  }
}

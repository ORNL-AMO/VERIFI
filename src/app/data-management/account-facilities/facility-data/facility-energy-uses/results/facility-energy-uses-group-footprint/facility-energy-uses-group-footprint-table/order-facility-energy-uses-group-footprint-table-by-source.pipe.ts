import { Pipe, PipeTransform } from '@angular/core';
import { AnnualFootprintGroupSourceResult, FootprintEquipmentAnnualResult, FootprintGroupIncludedSourcesAnnualResult } from 'src/app/calculations/energy-footprint/energyFootprintModels';
import * as _ from 'lodash';

@Pipe({
  name: 'orderFacilityEnergyUsesGroupFootprintTableBySource',
  standalone: false,
})
export class OrderFacilityEnergyUsesGroupFootprintTableBySourcePipe implements PipeTransform {

  transform(includedSourcesAnnualResults: Array<FootprintGroupIncludedSourcesAnnualResult>, orderByField: string, orderByYear: number, orderByDir: 'asc' | 'desc'): Array<FootprintGroupIncludedSourcesAnnualResult> {
    if (orderByField != 'name') {
      includedSourcesAnnualResults = _.orderBy(includedSourcesAnnualResults, (equip: { annualSourceResults: Array<AnnualFootprintGroupSourceResult> }) => {
        let yearData = equip.annualSourceResults.find(annualUse => annualUse.year == orderByYear);
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
        sourceResult.equipmentAnnualResults = _.orderBy(sourceResult.equipmentAnnualResults, (equipResult: FootprintEquipmentAnnualResult) => {
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
      includedSourcesAnnualResults = _.orderBy(includedSourcesAnnualResults, ['source'], [orderByDir]);
      includedSourcesAnnualResults.forEach(sourceResult => {
        sourceResult.equipmentAnnualResults = _.orderBy(sourceResult.equipmentAnnualResults, (equipmentResult: FootprintEquipmentAnnualResult) => {
          return equipmentResult.equipmentName;
        }, [orderByDir]);
      });
    }
    return includedSourcesAnnualResults;
  }

}

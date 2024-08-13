import { Pipe, PipeTransform } from '@angular/core';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

@Pipe({
  name: 'meterGroupOptions'
})
export class MeterGroupOptionsPipe implements PipeTransform {

  transform(groupOptions: Array<{ facilityId: string, groupOptions: Array<IdbUtilityMeterGroup> }>, facilityId: string, groupType: 'Energy' | 'Other' | 'Water'): Array<IdbUtilityMeterGroup> {
    let facilityOptions = groupOptions.filter(option => {
      return option.facilityId == facilityId
    });
    let typeOptions: Array<IdbUtilityMeterGroup> = new Array();
    facilityOptions.forEach(facilityOption => {
      facilityOption.groupOptions.forEach(option => {
        if (option.groupType == groupType) {
          typeOptions.push(option);
        }
      })
    });
    return typeOptions;
  }

}

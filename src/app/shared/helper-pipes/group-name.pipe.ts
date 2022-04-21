import { Pipe, PipeTransform } from '@angular/core';
import { UtilityMeterGroupdbService } from '../../indexedDB/utilityMeterGroup-db.service';

@Pipe({
  name: 'groupName'
})
export class GroupNamePipe implements PipeTransform {

  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService) {
  }

  transform(guid: string): string {
    let name: string = this.utilityMeterGroupDbService.getGroupName(guid);
    return name;
  }

}

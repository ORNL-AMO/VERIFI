import { Pipe, PipeTransform } from '@angular/core';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { getNAICS } from '../form-data/naics-data';

@Pipe({
  name: 'naicsDisplay'
})
export class NaicsDisplayPipe implements PipeTransform {

  transform(accountOrFacility: IdbAccount | IdbFacility): string {
    return getNAICS(accountOrFacility);
  }

}

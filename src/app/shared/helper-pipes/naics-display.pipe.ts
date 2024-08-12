import { Pipe, PipeTransform } from '@angular/core';
import { getNAICS } from '../form-data/naics-data';
import { AccountAndFacility } from 'src/app/models/idbModels/accountAndFacility';

@Pipe({
  name: 'naicsDisplay'
})
export class NaicsDisplayPipe implements PipeTransform {

  transform(accountOrFacility: AccountAndFacility): string {
    return getNAICS(accountOrFacility);
  }

}

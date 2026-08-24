import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { getNAICS } from '@shared/form-data/naics-data';
import { AccountAndFacility } from '@data/models/idbModels/accountAndFacility';

@Pipe({
    name: 'naicsDisplay',
    standalone: false
})
@Injectable({
  providedIn: 'root'
}) 
export class NaicsDisplayPipe implements PipeTransform {

  transform(accountOrFacility: AccountAndFacility): string {
    return getNAICS(accountOrFacility);
  }

}

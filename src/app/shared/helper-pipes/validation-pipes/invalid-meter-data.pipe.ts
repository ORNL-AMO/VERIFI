import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';

@Pipe({
  name: 'invalidMeterData',
  standalone: false,
  pure: false
})
export class InvalidMeterDataPipe implements PipeTransform {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);


  transform(meterId: string): boolean {
    let meterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getMeterData(meterId);
    return getHasDuplicateReadings(meterData).length > 0;
  }
}


// This function takes an array of meter data and returns an array of date strings that have duplicate readings.
// The date strings are in the format 'year_month_day'.
export function getHasDuplicateReadings(meterData: Array<IdbUtilityMeterData>): Array<string> {
  let readDateStrs: Array<string> = meterData.map(mData => {
    return mData.year + '_' + mData.month + '_' + mData.day;
  });
  //has duplicates
  let counts: Record<string, number> = _.countBy(readDateStrs, (dateStr: string) => {
    return dateStr;
  })
  let duplicateDates: Array<string> = [];
  for (let obj in counts) {
    if (counts[obj] > 1) {
      duplicateDates.push(obj);
    }
  }
  return duplicateDates;
}

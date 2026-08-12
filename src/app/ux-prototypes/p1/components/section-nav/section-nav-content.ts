import { P1FacilitySummary, P1NavGroup, P1StatusTone } from '../../p1.models';

export interface P1AccountNavCounts {
  facilities: number;
  meters: number;
  meterData: number;
  predictors: number;
  equipment: number;
  accountReports: number;
  facilityReports: number;
}

export function toneForNavCount(count: number): P1StatusTone {
  return count > 0 ? 'success' : 'warning';
}

export function accountNavCounts(facilities: Array<P1FacilitySummary>): P1AccountNavCounts {
  return facilities.reduce<P1AccountNavCounts>((totals, facility) => ({
    facilities: totals.facilities,
    meters: totals.meters + facility.meters,
    meterData: totals.meterData + facility.meterReadings,
    predictors: totals.predictors + facility.predictors,
    equipment: totals.equipment + facility.equipment,
    accountReports: totals.accountReports,
    facilityReports: totals.facilityReports + facility.reports
  }), {
    facilities: facilities.length,
    meters: 0,
    meterData: 0,
    predictors: 0,
    equipment: 0,
    accountReports: 0,
    facilityReports: 0
  });
}

export function utilityNavGroups(activeGroups: Array<P1NavGroup>): Array<P1NavGroup> {
  return activeGroups;
}

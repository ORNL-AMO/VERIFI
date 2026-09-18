import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { CalanderizationOptions } from '@data/models/calanderization';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';

export const CANONICAL_ENERGY_UNIT = 'MMBtu';
export const CANONICAL_LIQUID_UNIT = 'gal';
export const CANONICAL_GAS_UNIT = 'SCF';
export const CANONICAL_MASS_UNIT = 'lb';

export interface WorkspaceCalendarizationWorkerPayload {
  readonly meters: IdbUtilityMeter[];
  readonly allMeterData: IdbUtilityMeterData[];
  readonly accountOrFacility: IdbAccount;
  readonly monthDisplayShort: false;
  readonly calanderizationOptions: CalanderizationOptions;
  readonly co2Emissions: IdbCustomEmissionsItem[];
  readonly customFuels: IdbCustomFuel[];
  readonly facilities: IdbFacility[];
  readonly assessmentReportVersion: IdbAccount['assessmentReportVersion'];
  readonly customGWPs: IdbCustomGWP[];
}

export interface BuiltWorkspaceCalendarizationRequest {
  readonly accountGuid: string;
  readonly inputFingerprint: string;
  readonly payload: WorkspaceCalendarizationWorkerPayload;
}

/** Build the single v1 request without display-only preferences. */
export function buildWorkspaceCalendarizationRequest(
  snapshot: AccountWorkspaceSnapshot
): BuiltWorkspaceCalendarizationRequest {
  const meters = [...snapshot.meters]
    .sort(compareByGuid)
    .map(meter => cloneMeterWithoutDisplayPreferences(meter));
  const meterIds = new Set(meters.map(meter => meter.guid));
  const readings = snapshot.meterData
    .filter(reading => meterIds.has(reading.meterId))
    .sort(compareReading)
    .map(reading => ({ ...reading, charges: reading.charges?.map(charge => ({ ...charge })) }));
  const facilities = [...snapshot.facilities]
    .sort(compareByGuid)
    .map(facility => ({ ...facility }));
  const canonicalAccount: IdbAccount = {
    ...snapshot.account,
    energyUnit: CANONICAL_ENERGY_UNIT,
    electricityUnit: CANONICAL_ENERGY_UNIT,
    volumeLiquidUnit: CANONICAL_LIQUID_UNIT,
    volumeGasUnit: CANONICAL_GAS_UNIT,
    massUnit: CANONICAL_MASS_UNIT,
    energyIsSource: false,
    fiscalYear: 'calendarYear',
    fiscalYearMonth: 0,
    fiscalYearCalendarEnd: true
  };
  const payload: WorkspaceCalendarizationWorkerPayload = {
    meters,
    allMeterData: readings,
    accountOrFacility: canonicalAccount,
    monthDisplayShort: false,
    calanderizationOptions: { energyIsSource: false, neededUnits: CANONICAL_ENERGY_UNIT },
    co2Emissions: snapshot.customEmissions.map(item => ({ ...item })),
    customFuels: snapshot.customFuels.map(item => ({ ...item })),
    facilities,
    assessmentReportVersion: snapshot.account.assessmentReportVersion,
    customGWPs: snapshot.customGWPs.map(item => ({ ...item }))
  };
  return {
    accountGuid: snapshot.account.guid,
    inputFingerprint: fingerprintCalendarizationInputs(payload),
    payload
  };
}

function cloneMeterWithoutDisplayPreferences(meter: IdbUtilityMeter): IdbUtilityMeter {
  const clone = {
    ...meter,
    charges: meter.charges?.map(charge => ({ ...charge }))
  };
  delete clone.displayEnergyUnit;
  delete clone.displayEnergyIsSource;
  return clone;
}

function fingerprintCalendarizationInputs(payload: WorkspaceCalendarizationWorkerPayload): string {
  const value = JSON.stringify({
    meters: payload.meters,
    readings: payload.allMeterData,
    account: {
      guid: payload.accountOrFacility.guid,
      assessmentReportVersion: payload.assessmentReportVersion
    },
    facilities: payload.facilities.map(facility => ({
      guid: facility.guid,
      accountId: facility.accountId,
      eGridSubregion: facility.eGridSubregion
    })),
    customEmissions: payload.co2Emissions,
    customFuels: payload.customFuels,
    customGWPs: payload.customGWPs
  });
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${payload.accountOrFacility.guid}:${(hash >>> 0).toString(16)}:${value.length}`;
}

function compareByGuid(first: { readonly guid: string }, second: { readonly guid: string }): number {
  return first.guid.localeCompare(second.guid);
}

function compareReading(first: IdbUtilityMeterData, second: IdbUtilityMeterData): number {
  return first.meterId.localeCompare(second.meterId)
    || first.year - second.year
    || first.month - second.month
    || first.day - second.day
    || first.guid.localeCompare(second.guid);
}

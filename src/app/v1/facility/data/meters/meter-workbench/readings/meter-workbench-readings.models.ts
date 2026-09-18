import { ElectricityDataFilters, GeneralUtilityDataFilters, VehicleDataFilters } from '@data/models/meterDataFilter';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData, MeterDataCharge } from '@data/models/idbModels/utilityMeterData';

export type MeterReadingsTableType = 'electricity' | 'general' | 'vehicle' | 'other';
export type MeterReadingColumnSection = 'General Information' | 'Emissions' | 'Detailed Charges';
export type MeterReadingSortDirection = 'asc' | 'desc';
export type MeterReadingFilterOption = 'all' | 'estimated';
export type MeterReadingColumnAlignment = 'text' | 'number';

export interface MeterReadingColumn {
  readonly id: string;
  readonly label: string;
  readonly section: MeterReadingColumnSection;
  readonly align: MeterReadingColumnAlignment;
  readonly value: (reading: IdbUtilityMeterData) => number | string | undefined | null;
  readonly format?: 'number' | 'currency' | 'date';
}

export interface MeterReadingTableRow {
  readonly reading: IdbUtilityMeterData;
  readonly values: Readonly<Record<string, string>>;
  readonly sortValues: Readonly<Record<string, number | string | undefined | null>>;
  readonly hasNegativeReading: boolean;
  readonly negativeColumnIds: Readonly<Record<string, true>>;
}

export interface MeterReadingTableView {
  readonly columns: readonly MeterReadingColumn[];
  readonly rows: readonly MeterReadingTableRow[];
  readonly type: MeterReadingsTableType;
  readonly hasEstimatedReadings: boolean;
}

export type MeterReadingsBulkDeleteRequest = readonly IdbUtilityMeterData[];

export type MeterReadingsConfirmation =
  | { readonly kind: 'delete-one'; readonly reading: IdbUtilityMeterData }
  | { readonly kind: 'delete-many'; readonly readings: readonly IdbUtilityMeterData[] }
  | { readonly kind: 'fill-missing'; readonly count: number };

export interface MeterReadingColumnDraft {
  electricityFilters?: ElectricityDataFilters;
  generalFilters?: GeneralUtilityDataFilters;
  vehicleFilters?: VehicleDataFilters;
  charges: IdbUtilityMeter['charges'];
}

export interface MeterReadingPanelCloseRequest {
  readonly force?: boolean;
}

export function meterReadingsTableType(meter: IdbUtilityMeter | undefined): MeterReadingsTableType {
  if (!meter || meter.source === 'Electricity') {
    return 'electricity';
  }
  if (meter.scope === 2) {
    return 'vehicle';
  }
  if (meter.scope === 5 || meter.scope === 6) {
    return 'other';
  }
  return 'general';
}

export function isElectricityRecsMeter(meter: IdbUtilityMeter): boolean {
  return meter.agreementType === 4 || meter.agreementType === 6;
}

export function defaultElectricityFilters(account: IdbAccount | undefined): ElectricityDataFilters {
  const displayEmissions = !!account?.displayEmissions;
  return {
    generalInformationFilters: {
      showSection: true,
      totalCost: true,
      realDemand: true,
      billedDemand: true,
      powerFactor: true
    },
    emissionsFilters: {
      showSection: displayEmissions,
      marketEmissions: displayEmissions,
      locationEmissions: displayEmissions,
      recs: displayEmissions,
      excessRECs: displayEmissions,
      excessRECsEmissions: displayEmissions
    }
  };
}

export function defaultGeneralFilters(account: IdbAccount | undefined, meter: IdbUtilityMeter): GeneralUtilityDataFilters {
  const displayEmissions = !!account?.displayEmissions;
  return {
    totalVolume: true,
    totalCost: true,
    stationaryBiogenicEmmissions: displayEmissions,
    stationaryCarbonEmissions: displayEmissions,
    stationaryOtherEmissions: displayEmissions,
    totalEmissions: displayEmissions,
    heatCapacity: meter.source !== 'Water Intake' && meter.source !== 'Water Discharge'
  };
}

export function defaultVehicleFilters(account: IdbAccount | undefined, meter: IdbUtilityMeter): VehicleDataFilters {
  const displayEmissions = !!account?.displayEmissions;
  return {
    totalEnergy: true,
    totalCost: true,
    mobileBiogenicEmissions: displayEmissions,
    mobileCarbonEmissions: displayEmissions,
    mobileOtherEmissions: displayEmissions,
    mobileTotalEmissions: displayEmissions,
    fuelEfficiency: meter.vehicleCategory === 2
  };
}

export function getMeterChargeValue(
  charges: readonly MeterDataCharge[] | undefined,
  chargeGuid: string,
  amountOrUsage: 'amount' | 'usage'
): number | undefined {
  const charge = charges?.find(item => item.chargeGuid === chargeGuid);
  if (!charge) {
    return undefined;
  }
  return amountOrUsage === 'amount' ? charge.chargeAmount : charge.chargeUsage;
}

export function formatMeterReadingDate(reading: IdbUtilityMeterData): string {
  if (!reading || !Number.isFinite(reading.year) || !Number.isFinite(reading.month) || !Number.isFinite(reading.day)) {
    return '';
  }
  return new Date(reading.year, reading.month - 1, reading.day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatMeterReadingNumber(value: number | string | undefined | null, isCurrency = false): string {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (numericValue === undefined || numericValue === null || Number.isNaN(numericValue)) {
    return '';
  }
  let valueLabel: string;
  if (Math.abs(numericValue) < 10000) {
    valueLabel = Math.abs(numericValue) < .00001
      ? '0'
      : numericValue.toLocaleString(undefined, { maximumSignificantDigits: 5 });
  } else {
    valueLabel = numericValue.toLocaleString(undefined, { maximumFractionDigits: 0, minimumIntegerDigits: 1 });
  }
  return isCurrency ? `$${valueLabel}` : valueLabel;
}

export function cloneColumnDraft(draft: MeterReadingColumnDraft): MeterReadingColumnDraft {
  return {
    electricityFilters: draft.electricityFilters ? structuredClone(draft.electricityFilters) : undefined,
    generalFilters: draft.generalFilters ? structuredClone(draft.generalFilters) : undefined,
    vehicleFilters: draft.vehicleFilters ? structuredClone(draft.vehicleFilters) : undefined,
    charges: draft.charges ? structuredClone(draft.charges) : []
  };
}

export function buildColumnDraft(
  account: IdbAccount | undefined,
  facility: IdbFacility | undefined,
  meter: IdbUtilityMeter
): MeterReadingColumnDraft {
  return {
    electricityFilters: structuredClone(facility?.tableElectricityFilters ?? defaultElectricityFilters(account)),
    generalFilters: structuredClone(facility?.tableGeneralUtilityFilters ?? defaultGeneralFilters(account, meter)),
    vehicleFilters: structuredClone(facility?.tableVehicleDataFilters ?? defaultVehicleFilters(account, meter)),
    charges: structuredClone(meter.charges ?? [])
  };
}

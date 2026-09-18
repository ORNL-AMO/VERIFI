import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getConsumptionUnit, getUnitFromMeter } from '@domain/calculations/calanderization/calanderizationHelpers';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { getZeroEmissionsResults } from '@domain/calculations/emissions-calculations/emissions';
import { getFiscalYear } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { checkShowSiteToSource, getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import { EnergyUnitOptions, VolumeLiquidOptions } from '@shared/unitOptions';
import {
  ResolvedWorkspaceCalendarizationProjection,
  WorkspaceCalendarizationBaseResult,
  WorkspaceCalendarizationProjectionRequest,
  WorkspaceCalendarizationProjectionResult
} from './workspace-calendarization.models';

/** Convert a selected canonical slice without mutating or retaining another cache entry. */
export function projectWorkspaceCalendarization(
  base: WorkspaceCalendarizationBaseResult,
  snapshot: AccountWorkspaceSnapshot,
  request: WorkspaceCalendarizationProjectionRequest
): WorkspaceCalendarizationProjectionResult {
  const accountGuid = base.accountGuid ?? snapshot.account.guid;
  const inputFingerprint = base.inputFingerprint ?? '';
  const error = validateProjection(base, snapshot, request);
  if (error) {
    return {
      state: 'error', accountGuid, inputFingerprint, meters: [],
      error: { code: 'invalid-projection', message: error }
    };
  }

  const context = resolveContext(snapshot, request) as IdbAccount | IdbFacility;
  const targetContext = {
    ...context,
    energyUnit: request.energyUnit ?? context.energyUnit,
    volumeLiquidUnit: request.waterUnit ?? context.volumeLiquidUnit,
    energyIsSource: request.energyIsSource ?? context.energyIsSource
  };
  const contextMeterIds = new Set(snapshot.meters
    .filter(meter => request.context.kind === 'account' || meter.facilityId === request.context.guid)
    .map(meter => meter.guid));
  const requestedIds = request.meterGuids
    ? new Set(request.meterGuids)
    : contextMeterIds;
  const currentMeters = new Map(snapshot.meters.map(meter => [meter.guid, meter]));
  const projectedMeters = base.meters
    .filter(item => requestedIds.has(item.meter.guid))
    .map(item => projectMeter(item, currentMeters.get(item.meter.guid) ?? item.meter, targetContext, request.includeEmissions));
  const projection: ResolvedWorkspaceCalendarizationProjection = {
    context: request.context,
    meterGuids: projectedMeters.map(item => item.meter.guid).sort(),
    energyUnit: targetContext.energyUnit,
    waterUnit: targetContext.volumeLiquidUnit,
    energyIsSource: targetContext.energyIsSource,
    includeEmissions: request.includeEmissions,
    fiscalYear: targetContext.fiscalYear,
    fiscalYearMonth: targetContext.fiscalYearMonth,
    fiscalYearCalendarEnd: targetContext.fiscalYearCalendarEnd
  };
  return { state: 'ready', accountGuid, inputFingerprint, projection, meters: projectedMeters };
}

function projectMeter(
  base: CalanderizedMeter,
  meter: CalanderizedMeter['meter'],
  targetContext: IdbAccount | IdbFacility,
  includeEmissions: boolean
): CalanderizedMeter {
  const targetEnergyUnit = getConsumptionUnit(meter, targetContext);
  const targetConsumptionUnit = getUnitFromMeter(meter, targetContext) ?? base.consumptionUnit;
  const sourceApplies = targetContext.energyIsSource
    && checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope)
    && Number.isFinite(meter.siteToSource);
  const baseWasSource = base.energyIsSource
    && checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope)
    && Number.isFinite(meter.siteToSource)
    && meter.siteToSource !== 0;
  const monthlyData = base.monthlyData.map(month => {
    let siteEnergy = month.energyUse;
    if (baseWasSource) siteEnergy /= meter.siteToSource;
    const convertedEnergy = convert(siteEnergy, base.energyUnit, targetEnergyUnit);
    const energyUse = sourceApplies ? convertedEnergy * meter.siteToSource : convertedEnergy;
    const energyConsumption = convert(month.energyConsumption, base.consumptionUnit, targetConsumptionUnit);
    const emissions = includeEmissions ? emissionsFromMonth(month) : getZeroEmissionsResults();
    const date = month.date instanceof Date ? new Date(month.date) : new Date(month.date);
    return {
      ...month,
      ...emissions,
      date,
      fiscalYear: getFiscalYear(date, targetContext),
      energyUse,
      energyConsumption
    };
  });
  return {
    ...base,
    meter,
    monthlyData,
    consumptionUnit: targetConsumptionUnit,
    energyUnit: targetEnergyUnit,
    energyIsSource: targetContext.energyIsSource,
    showElectricalEmissions: includeEmissions && base.showElectricalEmissions,
    showOtherScope2Emissions: includeEmissions && base.showOtherScope2Emissions,
    showStationaryEmissions: includeEmissions && base.showStationaryEmissions,
    showFugitiveEmissions: includeEmissions && base.showFugitiveEmissions,
    showProcessEmissions: includeEmissions && base.showProcessEmissions,
    showMobileEmissions: includeEmissions && base.showMobileEmissions
  };
}

function validateProjection(
  base: WorkspaceCalendarizationBaseResult,
  snapshot: AccountWorkspaceSnapshot,
  request: WorkspaceCalendarizationProjectionRequest
): string | undefined {
  if (base.state !== 'ready' || base.accountGuid !== snapshot.account.guid) {
    return 'Canonical calendarization is not ready for the current account.';
  }
  const context = resolveContext(snapshot, request);
  if (!context) return `${request.context.kind === 'facility' ? 'Facility' : 'Account'} ${request.context.guid} is not available.`;
  if (request.energyUnit && !EnergyUnitOptions.some(option => option.value === request.energyUnit)) {
    return `${request.energyUnit} is not a supported energy unit.`;
  }
  if (request.waterUnit && !VolumeLiquidOptions.some(option => option.value === request.waterUnit)) {
    return `${request.waterUnit} is not a supported water unit.`;
  }
  const contextIds = new Set(snapshot.meters
    .filter(meter => request.context.kind === 'account' || meter.facilityId === request.context.guid)
    .map(meter => meter.guid));
  if (request.meterGuids?.some(guid => !contextIds.has(guid))) {
    return 'One or more selected meters are outside the requested context.';
  }
  if (request.waterUnit && request.includeEmissions && request.meterGuids?.some(guid => {
    const meter = snapshot.meters.find(item => item.guid === guid);
    return meter && !getIsEnergyUnit(meter.startingUnit);
  })) {
    return 'A water-only projection cannot include emissions.';
  }
  return undefined;
}

function resolveContext(
  snapshot: AccountWorkspaceSnapshot,
  request: WorkspaceCalendarizationProjectionRequest
): IdbAccount | IdbFacility | undefined {
  if (request.context.kind === 'account') {
    return request.context.guid === snapshot.account.guid ? snapshot.account : undefined;
  }
  return snapshot.facilities.find(facility => facility.guid === request.context.guid);
}

function convert(value: number, fromUnit: string, toUnit: string): number {
  if (!Number.isFinite(value) || !fromUnit || !toUnit || fromUnit === toUnit) return value;
  return new ConvertValue(value, fromUnit, toUnit).convertedValue;
}

function emissionsFromMonth(month: MonthlyData): ReturnType<typeof getZeroEmissionsResults> {
  const zero = getZeroEmissionsResults();
  return Object.fromEntries(
    Object.keys(zero).map(key => [key, month[key as keyof MonthlyData] ?? 0])
  ) as unknown as ReturnType<typeof getZeroEmissionsResults>;
}

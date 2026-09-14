import { Injectable, inject } from '@angular/core';
import { ElectricityDataFilters, GeneralUtilityDataFilters, VehicleDataFilters } from '@data/models/meterDataFilter';
import { EmissionsResults } from '@data/models/eGridEmissions';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getEmissions, setUtilityDataEmissionsValues } from '@domain/calculations/emissions-calculations/emissions';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { checkShowEmissionsOutputRate, checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import {
  MeterReadingColumn,
  MeterReadingColumnSection,
  MeterReadingTableRow,
  MeterReadingTableView,
  buildColumnDraft,
  formatMeterReadingDate,
  formatMeterReadingNumber,
  getMeterChargeValue,
  isElectricityRecsMeter,
  meterReadingsTableType
} from './meter-workbench-readings.models';

@Injectable({ providedIn: 'root' })
export class MeterReadingsTableService {
  private readonly eGridService = inject(EGridService);

  buildTableView(context: {
    account?: IdbAccount;
    facility?: IdbFacility;
    meter?: IdbUtilityMeter;
    readings: readonly IdbUtilityMeterData[];
    customFuels: readonly IdbCustomFuel[];
    customGWPs: readonly IdbCustomGWP[];
  }): MeterReadingTableView {
    const { account, facility, meter } = context;
    if (!account || !facility || !meter) {
      return { columns: [], rows: [], type: 'electricity', hasEstimatedReadings: false };
    }
    const type = meterReadingsTableType(meter);
    const draft = buildColumnDraft(account, facility, meter);
    const preparedReadings = context.readings
      .filter(reading => reading.meterId === meter.guid)
      .map(reading => this.withDerivedDisplayValues(reading, { account, facility, meter, customFuels: context.customFuels, customGWPs: context.customGWPs }));
    const columns = this.buildColumns(account, meter, draft.electricityFilters, draft.generalFilters, draft.vehicleFilters);
    const rows = preparedReadings.map(reading => this.toTableRow(reading, columns, meter, type));

    return {
      columns,
      rows,
      type,
      hasEstimatedReadings: preparedReadings.some(reading => reading.isEstimated)
    };
  }

  buildColumns(
    account: IdbAccount,
    meter: IdbUtilityMeter,
    electricityFilters: ElectricityDataFilters | undefined,
    generalFilters: GeneralUtilityDataFilters | undefined,
    vehicleFilters: VehicleDataFilters | undefined
  ): readonly MeterReadingColumn[] {
    const type = meterReadingsTableType(meter);
    if (type === 'electricity') {
      return this.electricityColumns(account, meter, electricityFilters);
    }
    if (type === 'vehicle') {
      return this.vehicleColumns(account, meter, vehicleFilters);
    }
    if (type === 'other') {
      return this.otherEmissionsColumns(meter);
    }
    return this.generalColumns(account, meter, generalFilters);
  }

  private withDerivedDisplayValues(reading: IdbUtilityMeterData, context: {
    account: IdbAccount;
    facility: IdbFacility;
    meter: IdbUtilityMeter;
    customFuels: readonly IdbCustomFuel[];
    customGWPs: readonly IdbCustomGWP[];
  }): IdbUtilityMeterData {
    const row = structuredClone(reading);
    const { account, facility, meter, customFuels, customGWPs } = context;
    if (meter.source === 'Electricity') {
      const emissionsValues = getEmissions(
        meter,
        row.totalEnergyUse,
        meter.energyUnit,
        row.year,
        false,
        [facility],
        this.eGridService.co2Emissions,
        [...customFuels],
        0,
        undefined,
        undefined,
        row.heatCapacity,
        account.assessmentReportVersion,
        []
      );
      return setUtilityDataEmissionsValues(row, emissionsValues);
    }
    if (meter.scope === 2) {
      const emissionsValues = getEmissions(
        meter,
        row.totalEnergyUse,
        meter.energyUnit,
        row.year,
        false,
        [facility],
        [],
        [...customFuels],
        row.totalVolume,
        meter.vehicleCollectionUnit,
        meter.vehicleDistanceUnit,
        row.vehicleFuelEfficiency,
        account.assessmentReportVersion,
        []
      );
      return {
        ...row,
        mobileBiogenicEmissions: emissionsValues.mobileBiogenicEmissions,
        mobileCarbonEmissions: emissionsValues.mobileCarbonEmissions,
        mobileOtherEmissions: emissionsValues.mobileOtherEmissions,
        mobileTotalEmissions: emissionsValues.mobileTotalEmissions
      };
    }
    if (meter.scope === 5 || meter.scope === 6) {
      const emissionsValues: EmissionsResults = getEmissions(
        meter,
        row.totalEnergyUse,
        meter.energyUnit,
        row.year,
        false,
        [facility],
        [],
        [...customFuels],
        row.totalVolume,
        meter.vehicleCollectionUnit,
        meter.vehicleDistanceUnit,
        row.heatCapacity,
        account.assessmentReportVersion,
        [...customGWPs]
      );
      return {
        ...row,
        fugitiveEmissions: emissionsValues.fugitiveEmissions,
        processEmissions: emissionsValues.processEmissions
      };
    }
    if (checkShowEmissionsOutputRate(meter)) {
      const emissionsValues = getEmissions(
        meter,
        row.totalEnergyUse,
        meter.energyUnit,
        row.year,
        false,
        [facility],
        this.eGridService.co2Emissions,
        [...customFuels],
        row.totalVolume,
        undefined,
        undefined,
        row.heatCapacity,
        account.assessmentReportVersion,
        []
      );
      return setUtilityDataEmissionsValues(row, emissionsValues);
    }
    return row;
  }

  private toTableRow(
    reading: IdbUtilityMeterData,
    columns: readonly MeterReadingColumn[],
    meter: IdbUtilityMeter,
    type: MeterReadingTableView['type']
  ): MeterReadingTableRow {
    const values = columns.reduce<Record<string, string>>((result, column) => {
      const value = column.value(reading);
      result[column.id] = column.format === 'date'
        ? formatMeterReadingDate(reading)
        : formatMeterReadingNumber(value, column.format === 'currency');
      return result;
    }, {});
    const sortValues = columns.reduce<Record<string, number | string | undefined | null>>((result, column) => {
      result[column.id] = column.format === 'date'
        ? new Date(reading.year, reading.month - 1, reading.day).getTime()
        : column.value(reading);
      return result;
    }, {});
    const negativeColumnIds = negativeReadingColumnIds(reading, columns, meter, type);
    return {
      reading,
      values,
      sortValues,
      hasNegativeReading: Object.keys(negativeColumnIds).length > 0 || hasHiddenNegativeReading(reading, meter, type),
      negativeColumnIds
    };
  }

  private electricityColumns(account: IdbAccount, meter: IdbUtilityMeter, filters: ElectricityDataFilters | undefined): MeterReadingColumn[] {
    const general = filters?.generalInformationFilters;
    const emissions = filters?.emissionsFilters;
    const recs = isElectricityRecsMeter(meter);
    const columns: MeterReadingColumn[] = [dateColumn()];
    if (!recs) {
      columns.push(numberColumn('totalEnergyUse', `Energy Use (${meter.energyUnit})`, 'General Information', reading => reading.totalEnergyUse));
      if (general?.totalCost) columns.push(currencyColumn('totalCost', 'Total Cost', 'General Information', reading => reading.totalCost));
      if (general?.realDemand) columns.push(numberColumn('totalRealDemand', `Real Demand (${meter.demandUnit ?? 'kW'})`, 'General Information', reading => reading.totalRealDemand));
      if (general?.billedDemand) columns.push(numberColumn('totalBilledDemand', `Billed Demand (${meter.demandUnit ?? 'kW'})`, 'General Information', reading => reading.totalBilledDemand));
      if (general?.powerFactor) columns.push(numberColumn('powerFactor', 'Power Factor', 'General Information', reading => reading.powerFactor));
      if (account.displayEmissions && emissions?.marketEmissions) columns.push(numberColumn('totalWithMarketEmissions', 'Market Emissions', 'Emissions', reading => reading.totalWithMarketEmissions));
      if (account.displayEmissions && emissions?.locationEmissions) columns.push(numberColumn('totalWithLocationEmissions', 'Location Emissions', 'Emissions', reading => reading.totalWithLocationEmissions));
      if (account.displayEmissions && emissions?.recs) columns.push(numberColumn('RECs', 'RECs (MWh)', 'Emissions', reading => reading.RECs));
    } else {
      if (general?.totalCost) columns.push(currencyColumn('totalCost', 'Total Cost', 'General Information', reading => reading.totalCost));
      if (account.displayEmissions && emissions?.recs) columns.push(numberColumn('RECs', 'RECs (MWh)', 'Emissions', reading => reading.RECs));
      if (account.displayEmissions && emissions?.excessRECs) columns.push(numberColumn('excessRECs', 'Excess RECs', 'Emissions', reading => reading.excessRECs));
      if (account.displayEmissions && emissions?.excessRECsEmissions) columns.push(numberColumn('excessRECsEmissions', 'Excess RECs Emissions', 'Emissions', reading => reading.excessRECsEmissions));
    }
    return columns.concat(chargeColumns(meter, 'electricity'));
  }

  private generalColumns(account: IdbAccount, meter: IdbUtilityMeter, filters: GeneralUtilityDataFilters | undefined): MeterReadingColumn[] {
    const columns: MeterReadingColumn[] = [dateColumn()];
    const showVolume = filters?.totalVolume && getIsEnergyUnit(meter.startingUnit) === false;
    const showEnergy = meter.source === 'Other' ? getIsEnergyUnit(meter.startingUnit) : getIsEnergyMeter(meter.source);
    const showHeatCapacity = filters?.heatCapacity && checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope);
    if (showVolume) columns.push(numberColumn('totalVolume', `Total Volume (${meter.startingUnit})`, 'General Information', reading => reading.totalVolume));
    if (showEnergy) columns.push(numberColumn('totalEnergyUse', `Energy Use (${meter.energyUnit})`, 'General Information', reading => reading.totalEnergyUse));
    if (showHeatCapacity) columns.push(numberColumn('heatCapacity', 'Heat Capacity', 'General Information', reading => reading.heatCapacity));
    if (filters?.totalCost) columns.push(currencyColumn('totalCost', 'Total Cost', 'General Information', reading => reading.totalCost));
    if (account.displayEmissions && checkShowEmissionsOutputRate(meter)) {
      if ((meter.source === 'Other Fuels' || meter.source === 'Natural Gas') && filters?.stationaryBiogenicEmmissions) {
        columns.push(numberColumn('stationaryBiogenicEmmissions', 'Biogenic Emissions', 'Emissions', reading => reading.stationaryBiogenicEmmissions));
      }
      if ((meter.source === 'Other Fuels' || meter.source === 'Natural Gas') && filters?.stationaryCarbonEmissions) {
        columns.push(numberColumn('stationaryCarbonEmissions', 'Carbon Emissions', 'Emissions', reading => reading.stationaryCarbonEmissions));
      }
      if ((meter.source === 'Other Fuels' || meter.source === 'Natural Gas') && filters?.stationaryOtherEmissions) {
        columns.push(numberColumn('stationaryOtherEmissions', 'Other Emissions', 'Emissions', reading => reading.stationaryOtherEmissions));
      }
      if (filters?.totalEmissions) {
        const key = meter.source === 'Other Energy' ? 'otherScope2Emissions' : 'stationaryEmissions';
        columns.push(numberColumn(key, 'Total Emissions', 'Emissions', reading => reading[key]));
      }
    }
    return columns.concat(chargeColumns(meter, 'general'));
  }

  private vehicleColumns(account: IdbAccount, meter: IdbUtilityMeter, filters: VehicleDataFilters | undefined): MeterReadingColumn[] {
    const consumptionLabel = meter.scope === 2 ? 'Distance' : 'Consumption';
    const volumeUnit = meter.vehicleCollectionType === 1 ? meter.vehicleCollectionUnit : meter.vehicleDistanceUnit;
    const columns: MeterReadingColumn[] = [
      dateColumn(),
      numberColumn('totalVolume', `${consumptionLabel} (${volumeUnit ?? meter.startingUnit})`, 'General Information', reading => reading.totalVolume)
    ];
    if (filters?.totalEnergy) columns.push(numberColumn('totalEnergyUse', `Energy Use (${meter.energyUnit})`, 'General Information', reading => reading.totalEnergyUse));
    if (filters?.fuelEfficiency && meter.vehicleCategory === 2) columns.push(numberColumn('vehicleFuelEfficiency', 'Fuel Efficiency', 'General Information', reading => reading.vehicleFuelEfficiency));
    if (filters?.totalCost) columns.push(currencyColumn('totalCost', 'Total Cost', 'General Information', reading => reading.totalCost));
    if (account.displayEmissions) {
      if (filters?.mobileBiogenicEmissions) columns.push(numberColumn('mobileBiogenicEmissions', 'Biogenic Emissions', 'Emissions', reading => reading.mobileBiogenicEmissions));
      if (filters?.mobileCarbonEmissions) columns.push(numberColumn('mobileCarbonEmissions', 'Carbon Emissions', 'Emissions', reading => reading.mobileCarbonEmissions));
      if (filters?.mobileOtherEmissions) columns.push(numberColumn('mobileOtherEmissions', 'Other Emissions', 'Emissions', reading => reading.mobileOtherEmissions));
      if (filters?.mobileTotalEmissions) columns.push(numberColumn('mobileTotalEmissions', 'Total Emissions', 'Emissions', reading => reading.mobileTotalEmissions));
    }
    return columns.concat(chargeColumns(meter, 'vehicle'));
  }

  private otherEmissionsColumns(meter: IdbUtilityMeter): MeterReadingColumn[] {
    return [
      dateColumn(),
      numberColumn('totalVolume', `Total Volume (${meter.startingUnit})`, 'General Information', reading => reading.totalVolume),
      currencyColumn('totalCost', 'Total Cost', 'General Information', reading => reading.totalCost),
      numberColumn('fugitiveEmissions', 'Fugitive Emissions', 'Emissions', reading => reading.fugitiveEmissions),
      numberColumn('processEmissions', 'Process Emissions', 'Emissions', reading => reading.processEmissions),
      ...chargeColumns(meter, 'other')
    ];
  }
}

function dateColumn(): MeterReadingColumn {
  return { id: 'readDate', label: 'Read Date', section: 'General Information', align: 'text', format: 'date', value: reading => formatMeterReadingDate(reading) };
}

function numberColumn(
  id: string,
  label: string,
  section: MeterReadingColumnSection,
  value: (reading: IdbUtilityMeterData) => number | undefined
): MeterReadingColumn {
  return { id, label, section, align: 'number', format: 'number', value };
}

function currencyColumn(
  id: string,
  label: string,
  section: MeterReadingColumnSection,
  value: (reading: IdbUtilityMeterData) => number | undefined
): MeterReadingColumn {
  return { id, label, section, align: 'number', format: 'currency', value };
}

function negativeReadingColumnIds(
  reading: IdbUtilityMeterData,
  columns: readonly MeterReadingColumn[],
  meter: IdbUtilityMeter,
  type: MeterReadingTableView['type']
): Readonly<Record<string, true>> {
  if (meter.canBeNegative) {
    return {};
  }
  const negativeColumns = new Set(negativeReadingColumns(reading, type));
  return columns.reduce<Record<string, true>>((result, column) => {
    if (negativeColumns.has(column.id)) {
      result[column.id] = true;
    }
    return result;
  }, {});
}

function hasHiddenNegativeReading(
  reading: IdbUtilityMeterData,
  meter: IdbUtilityMeter,
  type: MeterReadingTableView['type']
): boolean {
  return !meter.canBeNegative && negativeReadingColumns(reading, type).length > 0;
}

function negativeReadingColumns(reading: IdbUtilityMeterData, type: MeterReadingTableView['type']): string[] {
  if (type === 'electricity') {
    return reading.totalEnergyUse < 0 ? ['totalEnergyUse'] : [];
  }
  if (type === 'vehicle' || type === 'other') {
    return reading.totalVolume < 0 ? ['totalVolume'] : [];
  }
  return [
    reading.totalVolume < 0 ? 'totalVolume' : undefined,
    reading.totalEnergyUse < 0 ? 'totalEnergyUse' : undefined
  ].filter((column): column is string => !!column);
}

function chargeColumns(meter: IdbUtilityMeter, type: 'electricity' | 'general' | 'vehicle' | 'other'): MeterReadingColumn[] {
  return (meter.charges ?? []).flatMap(charge => {
    const columns: MeterReadingColumn[] = [];
    const canShowUsage = type === 'electricity'
      ? charge.chargeType === 'consumption' || charge.chargeType === 'demand'
      : type === 'general' && charge.chargeType === 'sewer';
    if (canShowUsage && charge.displayUsageInTable) {
      columns.push(numberColumn(`${charge.guid}:usage`, `${charge.name} (${meter.startingUnit})`, 'Detailed Charges', reading => getMeterChargeValue(reading.charges, charge.guid, 'usage')));
    }
    if (charge.displayChargeInTable) {
      columns.push(currencyColumn(`${charge.guid}:amount`, `${charge.name} ($)`, 'Detailed Charges', reading => getMeterChargeValue(reading.charges, charge.guid, 'amount')));
    }
    return columns;
  });
}

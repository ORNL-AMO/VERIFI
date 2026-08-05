import { IdbAccountReport } from '../../models/idbModels/accountReport';
import { IdbAnalysisItem } from '../../models/idbModels/analysisItem';
import { IdbFacility } from '../../models/idbModels/facility';
import { getNewIdbPredictor, IdbPredictor } from '../../models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from '../../models/idbModels/predictorData';
import { IdbUtilityMeter, MeterCharge } from '../../models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '../../models/idbModels/utilityMeterData';
import { MeterChargeType } from '../../shared/shared-meter-content/edit-meter-form/meter-charges-form/meterChargesOptions';
import { normalizeAnalysisGroupModelStorage } from '../../shared/shared-analysis/calculations/regression-model-recovery';
import {
  DataMigration,
  MigrationCollectionName,
  MigrationData
} from './data-migration.models';

const AFFECTED_STORES = [
  'accounts', 'facilities', 'utilityMeter', 'utilityMeterData', 'utilityMeterGroups', 'predictors',
  'analysisItems', 'accountAnalysisItems', 'accountReports', 'customFuels',
  'customGWP', 'predictor', 'predictorData', 'facilityReports',
  'customEmissionsItems', 'facilityEnergyUseGroups', 'facilityEnergyUseEquipment'
] as const;

export const VERSION_ZERO_TO_ONE_MIGRATION: DataMigration = {
  fromVersion: 0,
  toVersion: 1,
  description: 'Normalize legacy VERIFI persisted records.',
  affectedStores: AFFECTED_STORES,
  migrate(input: MigrationData) {
    const data = structuredClone(input);
    const changed = new Set<MigrationCollectionName>();

    data.accounts.forEach(account => {
      let recordChanged = false;
      if (!account.electricityUnit) { account.electricityUnit = 'kWh'; recordChanged = true; }
      if (account.volumeGasUnit === 'MCF') { account.volumeGasUnit = 'kSCF'; recordChanged = true; }
      if (!account.archiveOption) { account.archiveOption = 'skip'; recordChanged = true; }
      if (!account.assessmentReportVersion) { account.assessmentReportVersion = 'AR5'; recordChanged = true; }
      if (account.displayEmissions === undefined) {
        account.displayEmissions = account.name !== 'Cocoa Co. Example';
        recordChanged = true;
      }
      if (recordChanged) { changed.add('accounts'); }
    });

    data.facilities.forEach(facility => {
      let recordChanged = false;
      if (!facility.electricityUnit) { facility.electricityUnit = 'kWh'; recordChanged = true; }
      if (facility.volumeGasUnit === 'MCF') { facility.volumeGasUnit = 'kSCF'; recordChanged = true; }
      if (!facility.classification) { facility.classification = 'Manufacturing'; recordChanged = true; }
      if (recordChanged) { changed.add('facilities'); }
    });

    data.accountAnalyses.forEach(analysis => {
      let recordChanged = false;
      if (!analysis.analysisCategory) { analysis.analysisCategory = 'energy'; recordChanged = true; }
      if (!analysis.baselineYear) {
        const account = data.accounts.find(item => item.guid === analysis.accountId);
        analysis.baselineYear = account?.sustainabilityQuestions?.energyReductionBaselineYear ?? 2017;
        recordChanged = true;
      }
      if ((analysis as any).setupErrors !== undefined) {
        delete (analysis as any).setupErrors;
        recordChanged = true;
      }
      if (recordChanged) { changed.add('accountAnalyses'); }
    });

    data.facilityAnalyses.forEach(analysis => {
      if (normalizeFacilityAnalysis(analysis, data.facilities)) {
        changed.add('facilityAnalyses');
      }
    });

    data.meters.forEach(meter => {
      const readings = data.meterData.filter(reading => reading.meterId === meter.guid);
      const result = normalizeMeter(meter, readings);
      if (result.meterChanged) { changed.add('meters'); }
      if (result.readingsChanged) { changed.add('meterData'); }
    });

    data.meterData.forEach(reading => {
      if (!reading.migratedDates && (reading as any).readDate) {
        const date = dateParts((reading as any).readDate, true);
        reading.year = date.year;
        reading.month = date.month;
        reading.day = date.day;
        reading.migratedDates = true;
        changed.add('meterData');
      }
    });

    data.predictorData.forEach(reading => {
      if (!reading.migratedDates && (reading as any).date) {
        const date = dateParts((reading as any).date, false);
        reading.year = date.year;
        reading.month = date.month;
        reading.migratedDates = true;
        changed.add('predictorData');
      }
    });

    migrateDeprecatedPredictors(data, changed);

    data.accountReports.forEach(report => {
      if (normalizeReport(report, data.facilities, data.meterGroups)) {
        changed.add('accountReports');
      }
    });

    data.customFuels.forEach(fuel => {
      if (Number.isNaN(fuel.CO2) && fuel.directEmissionsRate === undefined) {
        fuel.directEmissionsRate = true;
        changed.add('customFuels');
      }
    });

    data.customGWPs.forEach(gwp => {
      if (gwp.gwp_ar4 === undefined && (gwp as any).gwp !== undefined) {
        gwp.gwp_ar4 = (gwp as any).gwp;
        gwp.gwp_ar5 = (gwp as any).gwp;
        gwp.gwp_ar6 = (gwp as any).gwp;
        delete (gwp as any).gwp;
        changed.add('customGWPs');
      }
    });

    return { data, changedCollections: [...changed] };
  }
};

function normalizeFacilityAnalysis(analysis: IdbAnalysisItem, facilities: Array<IdbFacility>): boolean {
  let changed = false;
  const facility = facilities.find(item => item.guid === analysis.facilityId);
  if (!analysis.analysisCategory) { analysis.analysisCategory = 'energy'; changed = true; }
  if ((analysis as any).setupErrors !== undefined) { delete (analysis as any).setupErrors; changed = true; }
  if (!analysis.baselineYear) {
    analysis.baselineYear = facility?.sustainabilityQuestions?.energyReductionBaselineYear ?? 2017;
    changed = true;
  }
  analysis.groups?.forEach((group, index) => {
    const legacy = group as any;
    if (legacy.groupErrors !== undefined) { delete legacy.groupErrors; changed = true; }
    if (legacy.baselineAdjustments !== undefined) {
      group.dataAdjustments = legacy.baselineAdjustments;
      delete legacy.baselineAdjustments;
      changed = true;
    }
    if (group.baselineAdjustmentsV2 === undefined) { group.baselineAdjustmentsV2 = []; changed = true; }
    if (group.maxModelVariables === undefined) { group.maxModelVariables = 4; changed = true; }
    if (legacy.userDefinedModel !== undefined) {
      group.isGeneratedModel = legacy.userDefinedModel;
      delete legacy.userDefinedModel;
      changed = true;
    }
    if (group.analysisType === 'regression' && !group.isGeneratedModel) {
      if (group.regressionModelStartMonth === undefined) { group.regressionModelStartMonth = 0; changed = true; }
      if (group.regressionStartYear === undefined) { group.regressionStartYear = analysis.baselineYear; changed = true; }
      if (group.regressionModelEndMonth === undefined) { group.regressionModelEndMonth = 11; changed = true; }
      if (group.regressionEndYear === undefined) { group.regressionEndYear = analysis.baselineYear; changed = true; }
    }
    if (legacy.hasDataAdjustement !== undefined) {
      delete legacy.hasDataAdjustement;
      group.dataAdjustments = group.dataAdjustments.filter(adjustment => adjustment.amount !== 0);
      changed = true;
    }
    if (legacy.hasBaselineAdjustmentV2 !== undefined) {
      delete legacy.hasBaselineAdjustmentV2;
      group.baselineAdjustmentsV2 = group.baselineAdjustmentsV2.filter(adjustment => adjustment.amount !== 0);
      changed = true;
    }
    const normalized = normalizeAnalysisGroupModelStorage(group, facility, analysis.baselineYear);
    if (normalized.isChanged) { analysis.groups[index] = normalized.group; changed = true; }
  });
  return changed;
}

function normalizeMeter(meter: IdbUtilityMeter, readings: Array<IdbUtilityMeterData>): {
  meterChanged: boolean; readingsChanged: boolean;
} {
  let meterChanged = false;
  let readingsChanged = false;
  const legacySource = meter.source as string;
  if (legacySource === 'Water') { meter.source = 'Water Intake'; meter.waterIntakeType = 'Municipal (Potable)'; meterChanged = true; }
  if (legacySource === 'Waste Water') { meter.source = 'Water Discharge'; meter.waterDischargeType = 'Municipal Sewer'; meterChanged = true; }
  if (legacySource === 'Other Utility') { meter.source = 'Other'; meterChanged = true; }
  if (meter.startingUnit === 'Dtherm') { meter.startingUnit = 'DTherm'; meterChanged = true; }
  if (meter.energyUnit === 'Dtherm') { meter.energyUnit = 'DTherm'; meterChanged = true; }
  if (meter.fuel === 'Fuel Oil #5') { meter.fuel = 'Fuel Oil #5 (Navy Special)'; meterChanged = true; }
  if (meter.importWizardName) { delete meter.importWizardName; meterChanged = true; }
  if (!meter.demandUnit) { meter.demandUnit = 'kW'; meterChanged = true; }
  if (!meter.charges) {
    meter.charges = [];
    meterChanged = true;
    readingsChanged = true;
    readings.forEach(reading => migrateCharges(meter, reading));
  }
  return { meterChanged, readingsChanged };
}

const LEGACY_CHARGES: ReadonlyArray<[string, string | undefined, MeterChargeType, string]> = [
  ['commodityCharge', undefined, 'consumption', 'Commodity Charge'],
  ['deliveryCharge', undefined, 'consumption', 'Delivery Charge'],
  ['nonEnergyCharge', undefined, 'other', 'Non-Energy Charge'],
  ['block1ConsumptionCharge', 'block1Consumption', 'consumption', 'Block 1 Consumption Charge'],
  ['block2ConsumptionCharge', 'block2Consumption', 'consumption', 'Block 2 Consumption Charge'],
  ['block3ConsumptionCharge', 'block3Consumption', 'consumption', 'Block 3 Consumption Charge'],
  ['otherConsumptionCharge', 'otherConsumption', 'consumption', 'Other Consumption Charge'],
  ['onPeakCharge', 'onPeakAmount', 'consumption', 'On-Peak Charge'],
  ['offPeakCharge', 'offPeakAmount', 'consumption', 'Off-Peak Charge'],
  ['transmissionAndDeliveryCharge', undefined, 'consumption', 'Transmission and Delivery Charge'],
  ['powerFactorCharge', 'powerFactor', 'other', 'Power Factor Charge'],
  ['localSalesTax', undefined, 'tax', 'Local Sales Tax'],
  ['stateSalesTax', undefined, 'tax', 'State Sales Tax'],
  ['latePayment', undefined, 'lateFee', 'Late Payment'],
  ['otherCharge', undefined, 'other', 'Other Charge'],
  ['demandCharge', 'demandUsage', 'demand', 'Demand Charge']
];

function migrateCharges(meter: IdbUtilityMeter, reading: IdbUtilityMeterData): void {
  reading.charges ??= [];
  const legacy = reading as any;
  LEGACY_CHARGES.forEach(([amountField, usageField, type, name]) => {
    const amount = legacy[amountField];
    const usage = usageField ? legacy[usageField] : 0;
    if (!amount && !usage) { return; }
    let charge: MeterCharge = meter.charges.find(item => item.name === name);
    if (!charge) {
      charge = {
        guid: `${meter.guid}-legacy-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name, chargeType: type, displayUsageInTable: true, displayChargeInTable: true
      };
      meter.charges.push(charge);
    }
    reading.charges.push({ chargeGuid: charge.guid, chargeAmount: amount, chargeUsage: usage });
  });
}

function migrateDeprecatedPredictors(data: MigrationData, changed: Set<MigrationCollectionName>): void {
  if (data.deprecatedPredictorData.length === 0) { return; }
  const existingPredictors = new Set(data.predictors.map(item => item.guid));
  const existingReadings = new Set(data.predictorData.map(item => `${item.predictorId}:${item.year}:${item.month}`));
  const entriesByFacility = new Map<string, MigrationData['deprecatedPredictorData']>();
  data.deprecatedPredictorData.forEach(entry => {
    entriesByFacility.set(entry.facilityId, [...(entriesByFacility.get(entry.facilityId) ?? []), entry]);
  });
  entriesByFacility.forEach(entries => {
    const firstPredictors = entries[0]?.predictors ?? [];
    firstPredictors.forEach(oldPredictor => {
      let predictor = data.predictors.find(item => item.guid === oldPredictor.id);
      if (!predictor) {
        predictor = getNewIdbPredictor(entries[0].accountId, entries[0].facilityId);
        Object.assign(predictor, oldPredictor, {
          id: undefined,
          guid: oldPredictor.id,
          description: oldPredictor.description ?? oldPredictor.name
        });
        data.predictors.push(predictor);
        existingPredictors.add(predictor.guid);
        changed.add('predictors');
      }
      entries.forEach(entry => {
        const value = entry.predictors.find(item => item.id === oldPredictor.id);
        if (!value) { return; }
        const date = dateParts(entry.date, false);
        const key = `${predictor.guid}:${date.year}:${date.month}`;
        if (existingReadings.has(key)) { return; }
        const reading: IdbPredictorData = getNewIdbPredictorData(predictor, undefined);
        Object.assign(reading, {
          id: undefined,
          guid: `${entry.guid}-${predictor.guid}`,
          year: date.year,
          month: date.month,
          amount: value.amount,
          weatherDataWarning: value.weatherDataWarning,
          weatherOverride: value.weatherOverride,
          migratedDates: true
        });
        data.predictorData.push(reading);
        existingReadings.add(key);
        changed.add('predictorData');
      });
    });
  });
  data.deprecatedPredictorData = [];
  changed.add('deprecatedPredictorData');
}

function normalizeReport(report: IdbAccountReport, facilities: Array<IdbFacility>, groups: MigrationData['meterGroups']): boolean {
  let changed = false;
  if (report.reportType === 'betterPlants' && report.betterPlantsReportSetup?.includePerformanceTable === undefined) {
    report.betterPlantsReportSetup.includePerformanceTable = true; changed = true;
  }
  if (report.reportType === 'betterClimate' && report.betterClimateReportSetup) {
    if (report.betterClimateReportSetup.selectMeterData === undefined) {
      report.betterClimateReportSetup.selectMeterData = false; changed = true;
    }
    if (report.betterClimateReportSetup.includedFacilityGroups === undefined) {
      report.betterClimateReportSetup.includedFacilityGroups = facilities
        .filter(facility => facility.accountId === report.accountId)
        .map(facility => ({
          facilityId: facility.guid,
          include: true,
          groups: groups.filter(group => group.facilityId === facility.guid)
            .map(group => ({ groupId: group.guid, include: true }))
        }));
      changed = true;
    }
  }
  if (report.reportType === 'dataOverview' && report.dataOverviewReportSetup) {
    if (report.dataOverviewReportSetup.includeAllMeterData === undefined) {
      report.dataOverviewReportSetup.includeAllMeterData = true; changed = true;
    }
    report.dataOverviewReportSetup.includedFacilities?.forEach(facility => {
      if (facility.includedGroups === undefined) {
        facility.includedGroups = groups.filter(group => group.facilityId === facility.facilityId)
          .map(group => ({ groupId: group.guid, include: true }));
        changed = true;
      }
    });
  }
  return changed;
}

function dateParts(value: Date | string, includeDay: boolean): { year: number; month: number; day?: number } {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) {
      return { year: Number(match[1]), month: Number(match[2]), day: includeDay ? Number(match[3]) : undefined };
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: includeDay ? date.getDate() : undefined };
}

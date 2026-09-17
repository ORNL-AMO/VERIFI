import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAccount } from '@data/models/idbModels/account';
import { DataStalenessSettings } from '@data/models/idbModels/accountAndFacility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { AnalysisSetupErrors, GroupAnalysisErrors } from '@data/models/validation';
import { buildMeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { getYearsWithFullData } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { getAccountAnalysisSetupErrors } from '@domain/calculations/status-check-calculations/validation/accountAnalysisValidation';
import { getAccountReportErrors } from '@domain/calculations/status-check-calculations/validation/accountReportValidation';
import { getAnalysisSetupErrors } from '@domain/calculations/status-check-calculations/validation/analysisValidation';
import { getFacilityReportErrors } from '@domain/calculations/status-check-calculations/validation/facilityReportValidation';
import {
  checkDateRangeValidity,
  checkTwelveMonthSelection,
  getGroupErrors,
  validateMeterDataForSelectedDates,
  validatePredictorDataForSelectedDates
} from '@domain/calculations/status-check-calculations/validation/groupAnalysisValidation';
import { getFuelTypeOptions } from '@shared/fuel-options/getFuelTypeOptions';
import { checkShowHeatCapacity, checkShowSiteToSource, getHeatingCapacity } from '@shared/sharedHelperFunctions';
import { StatusEntityRef, StatusEvaluation, StatusFinding, makeFinding } from './status.models';
import { DEFAULT_DATA_STALENESS_MONTHS, DataStalenessMonths } from './status.settings';

/** Executable implementation of docs/v1-data-validation-rules.md. */

interface EvaluationContext {
  readonly snapshot: AccountWorkspaceSnapshot;
  readonly calendarizedMeters: readonly CalanderizedMeter[];
  readonly asOfDate: Date;
  readonly revision: number;
}

interface RecordStatusIndex {
  readonly meterErrors: ReadonlySet<string>;
  readonly predictorErrors: ReadonlySet<string>;
}

export function evaluateWorkspaceStatus(context: EvaluationContext): StatusEvaluation {
  const { snapshot, calendarizedMeters, asOfDate, revision } = context;
  const findings: StatusFinding[] = [];
  findings.push(...evaluateAccount(snapshot));

  for (const facility of snapshot.facilities) {
    const facilityMeters = snapshot.meters.filter(meter => meter.facilityId === facility.guid);
    const facilityMeterData = snapshot.meterData.filter(reading => reading.facilityId === facility.guid);
    const facilityGroups = snapshot.meterGroups.filter(group => group.facilityId === facility.guid);
    const facilityPredictors = snapshot.predictors.filter(predictor => predictor.facilityId === facility.guid);
    const facilityPredictorData = snapshot.predictorData.filter(data => data.facilityId === facility.guid);
    const facilityCalendarized = calendarizedMeters.filter(item => item.meter.facilityId === facility.guid);
    const latestFacilityMonth = latestCalendarizedMonth(facilityCalendarized);
    const staleness = effectiveStaleness(snapshot.account, facility);

    findings.push(...evaluateFacility(snapshot.account, facility, facilityMeters, facilityGroups.length, facilityPredictors));
    for (const meter of facilityMeters) {
      findings.push(...evaluateMeter(
        meter,
        facilityMeterData.filter(reading => reading.meterId === meter.guid),
        snapshot.customFuels,
        latestFacilityMonth,
        staleness,
        asOfDate
      ));
    }
    for (const predictor of facilityPredictors) {
      findings.push(...evaluatePredictor(predictor, facilityPredictorData.filter(data => data.predictorId === predictor.guid), latestFacilityMonth, staleness, asOfDate));
    }
  }

  const recordIndex: RecordStatusIndex = {
    meterErrors: new Set(findings.filter(item => item.entity.kind === 'meter' && item.severity === 'error').map(item => item.entity.guid)),
    predictorErrors: new Set(findings.filter(item => item.entity.kind === 'predictor' && item.severity === 'error').map(item => item.entity.guid))
  };
  const analysisResult = evaluateAnalyses(snapshot, calendarizedMeters, recordIndex);
  findings.push(...analysisResult.findings);
  findings.push(...evaluateReports(snapshot, analysisResult.facilityErrors, analysisResult.facilityWarnings, analysisResult.accountErrors, analysisResult.accountWarnings));

  return {
    accountGuid: snapshot.account.guid,
    revision,
    evaluatedAt: asOfDate.toISOString(),
    findings: deduplicateFindings(findings)
  };
}

function evaluateAccount(snapshot: AccountWorkspaceSnapshot): StatusFinding[] {
  const entity = accountEntity(snapshot.account);
  const findings: StatusFinding[] = [];
  if (snapshot.account.name === 'New Account') {
    findings.push(makeFinding('account.configuration.default-name', 'warning', 'configuration', entity));
  }
  if (snapshot.facilities.length === 0) {
    findings.push(makeFinding('account.facilities.missing', 'error', 'readiness', entity));
  }
  return findings;
}

function evaluateFacility(
  account: IdbAccount,
  facility: IdbFacility,
  meters: readonly IdbUtilityMeter[],
  groupCount: number,
  predictors: readonly IdbPredictor[]
): StatusFinding[] {
  const entity = facilityEntity(account, facility);
  const findings: StatusFinding[] = [];
  if (meters.length === 0) {
    findings.push(makeFinding('facility.meters.missing', 'error', 'readiness', entity));
  } else if (groupCount === 0) {
    findings.push(makeFinding('facility.meter-groups.missing', 'warning', 'readiness', entity));
  }
  if (predictors.length === 0) {
    findings.push(makeFinding('facility.predictors.missing', 'error', 'readiness', entity));
  }
  return findings;
}

function evaluateMeter(
  meter: IdbUtilityMeter,
  readings: readonly IdbUtilityMeterData[],
  customFuels: readonly IdbCustomFuel[],
  facilityLatest: Date | undefined,
  staleness: { enabled: boolean; thresholdMonths: DataStalenessMonths },
  asOfDate: Date
): StatusFinding[] {
  const entity = meterEntity(meter);
  const findings: StatusFinding[] = [];
  const invalidFields = invalidMeterFields(meter, customFuels);
  if (invalidFields.length > 0) {
    findings.push(makeFinding('meter.configuration.invalid', 'error', 'configuration', entity, { fields: invalidFields }));
  }
  if (!meter.meterReadingDataApplication) {
    findings.push(makeFinding('meter.calendarization.missing', 'warning', 'configuration', entity));
  }
  if (readings.length === 0) {
    findings.push(makeFinding('meter.data.missing', 'error', 'completeness', entity));
    return findings;
  }

  const duplicateDates = duplicateMeterDates(readings);
  if (duplicateDates.length > 0) {
    findings.push(makeFinding('meter.data.duplicate-date', 'error', 'quality', entity, { dates: duplicateDates }));
  }
  if (!meter.canBeNegative) {
    const negativeCount = readings.filter(reading => reading.totalEnergyUse < 0 || (reading.totalVolume !== undefined && reading.totalVolume < 0)).length;
    if (negativeCount > 0) {
      findings.push(makeFinding('meter.data.negative', 'error', 'quality', entity, { count: negativeCount }));
    }
  }
  const gaps = meterGaps(meter, readings);
  if (gaps.length > 0) {
    findings.push(makeFinding('meter.data.gap', 'error', 'completeness', entity, {
      count: gaps.length,
      periods: gaps,
      periodType: meter.meterReadingDataApplication === 'fullYear' ? 'year' : 'month'
    }));
  }

  const latest = latestMeterDate(readings);
  findings.push(...currencyFindings('meter', entity, latest, facilityLatest, meter.ignoreDateStatusChecks, meter.noLongerInUse, meter.noLongerInUseMonth, meter.noLongerInUseYear, staleness, asOfDate));

  const quality = buildMeterDataQualityReport(readings, meter);
  if (quality.energyOutlierCount > 0) {
    findings.push(makeFinding('meter.quality.consumption-outlier', 'warning', 'quality', entity, { count: quality.energyOutlierCount }));
  }
  if (quality.costOutlierCount > 0) {
    findings.push(makeFinding('meter.quality.cost-outlier', 'warning', 'quality', entity, { count: quality.costOutlierCount }));
  }
  return findings;
}

function evaluatePredictor(
  predictor: IdbPredictor,
  data: readonly IdbPredictorData[],
  facilityLatest: Date | undefined,
  staleness: { enabled: boolean; thresholdMonths: DataStalenessMonths },
  asOfDate: Date
): StatusFinding[] {
  const entity = predictorEntity(predictor);
  if (data.length === 0) {
    return [makeFinding('predictor.data.missing', 'error', 'completeness', entity)];
  }
  const findings: StatusFinding[] = [];
  const counts = monthCounts(data.map(item => ({ month: item.month, year: item.year })));
  const duplicateCount = [...counts.values()].filter(count => count > 1).length;
  if (duplicateCount > 0) {
    findings.push(makeFinding('predictor.data.duplicate-month', 'error', 'quality', entity, { count: duplicateCount }));
  }
  const gaps = missingMonths(data.map(item => ({ month: item.month, year: item.year })));
  if (gaps.length > 0) {
    findings.push(makeFinding('predictor.data.gap', 'error', 'completeness', entity, { count: gaps.length, periods: gaps }));
  }
  if (!predictor.canBeNegative) {
    const negativeCount = data.filter(item => item.amount < 0).length;
    if (negativeCount > 0) {
      findings.push(makeFinding('predictor.data.negative', 'error', 'quality', entity, { count: negativeCount }));
    }
  }
  const latest = latestMonth(data.map(item => ({ month: item.month, year: item.year })));
  findings.push(...currencyFindings('predictor', entity, latest, facilityLatest, predictor.ignoreDateStatusChecks, predictor.noLongerInUse, predictor.noLongerInUseMonth, predictor.noLongerInUseYear, staleness, asOfDate));
  if (predictor.predictorType === 'Weather' && !predictor.ignoreWeatherDataWarning && data.some(item => item.weatherDataWarning)) {
    findings.push(makeFinding('predictor.weather.warning', 'warning', 'quality', entity));
  }
  return findings;
}

function evaluateAnalyses(snapshot: AccountWorkspaceSnapshot, calendarizedMeters: readonly CalanderizedMeter[], recordIndex: RecordStatusIndex): {
  findings: StatusFinding[];
  facilityErrors: Map<string, AnalysisSetupErrors>;
  facilityWarnings: Set<string>;
  accountErrors: Map<string, ReturnType<typeof getAccountAnalysisSetupErrors>>;
  accountWarnings: Set<string>;
} {
  const findings: StatusFinding[] = [];
  const facilityErrors = new Map<string, AnalysisSetupErrors>();
  const facilityWarnings = new Set<string>();
  for (const analysis of snapshot.facilityAnalyses) {
    const facility = snapshot.facilities.find(item => item.guid === analysis.facilityId);
    if (!facility) continue;
    const groupErrors: GroupAnalysisErrors[] = [];
    let groupWarning = false;
    for (const group of analysis.groups) {
      const errors = completeGroupErrors(
        group,
        analysis,
        getGroupErrors(group, analysis, [...calendarizedMeters], [...snapshot.predictorData]),
        snapshot,
        calendarizedMeters
      );
      groupErrors.push(errors);
      if (group.analysisType === 'skip' || group.analysisType === 'skipAnalysis') continue;
      const entity = analysisGroupEntity(analysis, group, facility);
      const setupReasons = groupErrorReasons(errors);
      if (setupReasons.length > 0) {
        findings.push(makeFinding('analysis-group.setup.invalid', 'error', 'configuration', entity, { reasons: setupReasons }));
      }
      if (errors.hasInvalidRegressionModel) {
        findings.push(makeFinding('analysis-group.model.invalid', 'warning', 'quality', entity));
        groupWarning = true;
      }
      const inputs = groupInputIds(group, snapshot.meters.filter(meter => meter.facilityId === facility.guid));
      if ([...inputs.meterIds].some(id => recordIndex.meterErrors.has(id)) || [...inputs.predictorIds].some(id => recordIndex.predictorErrors.has(id))) {
        findings.push(makeFinding('analysis-group.inputs.invalid', 'warning', 'quality', entity));
        groupWarning = true;
      }
    }
    const facilityCalendarized = calendarizedMeters.filter(item => item.meter.facilityId === facility.guid);
    const availableCompleteYears = getYearsWithFullData([...facilityCalendarized], facility) ?? [];
    const baselineUnavailable = validNumber(analysis.baselineYear) && !availableCompleteYears.includes(analysis.baselineYear);
    const calculatedErrors = getAnalysisSetupErrors(analysis, [...calendarizedMeters], facility, groupErrors);
    const errors: AnalysisSetupErrors = {
      ...calculatedErrors,
      analysisId: analysis.guid,
      accountId: analysis.accountId,
      missingName: !analysis.name?.trim(),
      noGroups: analysis.groups.length === 0,
      missingBaselineYear: !validNumber(analysis.baselineYear),
      groupsHaveErrors: groupErrors.some(error => error.hasErrors),
      bankingError: !!analysis.hasBanking && (!analysis.bankedAnalysisItemId || !snapshot.facilityAnalyses.some(item => item.guid === analysis.bankedAnalysisItemId))
    };
    errors.setupHasError = errors.missingName || errors.noGroups || errors.missingBaselineYear || baselineUnavailable
      || errors.baselineYearAfterMeterDataEnd || errors.baselineYearBeforeMeterDataStart || errors.bankingError;
    errors.hasError = errors.setupHasError || errors.groupsHaveErrors;
    facilityErrors.set(analysis.guid, errors);
    const reasons = analysisErrorReasons(errors, baselineUnavailable);
    if (reasons.length > 0) {
      findings.push(makeFinding('analysis.configuration.invalid', 'error', 'configuration', facilityAnalysisEntity(analysis, facility), { reasons }));
    }
    if (groupWarning) facilityWarnings.add(analysis.guid);
  }

  const accountErrors = new Map<string, ReturnType<typeof getAccountAnalysisSetupErrors>>();
  const accountWarnings = new Set<string>();
  for (const analysis of snapshot.accountAnalyses) {
    const calculatedErrors = getAccountAnalysisSetupErrors(analysis, [...facilityErrors.values()]);
    const selections = analysis.facilityAnalysisItems ?? [];
    const selectionsInvalid = selections.length === 0 || selections.some(selection => {
      if (!selection.analysisItemId || selection.analysisItemId === 'skip') return selection.analysisItemId !== 'skip';
      const linkedAnalysis = snapshot.facilityAnalyses.find(item => item.guid === selection.analysisItemId && item.facilityId === selection.facilityId);
      return !linkedAnalysis || !!facilityErrors.get(selection.analysisItemId)?.hasError;
    });
    const errors = {
      ...calculatedErrors,
      missingName: !analysis.name?.trim(),
      missingBaselineYear: !validNumber(analysis.baselineYear),
      facilitiesSelectionsInvalid: selectionsInvalid
    };
    errors.hasSetupErrors = errors.missingName || errors.missingBaselineYear;
    errors.hasError = errors.hasSetupErrors || errors.facilitiesSelectionsInvalid;
    accountErrors.set(analysis.guid, errors);
    const reasons = accountAnalysisErrorReasons(errors);
    if (reasons.length > 0) {
      findings.push(makeFinding('account-analysis.configuration.invalid', 'error', 'configuration', accountAnalysisEntity(analysis, snapshot.account), { reasons }));
    }
    if (analysis.facilityAnalysisItems?.some(item => item.analysisItemId && facilityWarnings.has(item.analysisItemId))) {
      findings.push(makeFinding('account-analysis.children.warning', 'warning', 'quality', accountAnalysisEntity(analysis, snapshot.account)));
      accountWarnings.add(analysis.guid);
    }
  }
  return { findings, facilityErrors, facilityWarnings, accountErrors, accountWarnings };
}

function evaluateReports(
  snapshot: AccountWorkspaceSnapshot,
  facilityAnalysisErrors: Map<string, AnalysisSetupErrors>,
  facilityAnalysisWarnings: Set<string>,
  accountAnalysisErrors: Map<string, ReturnType<typeof getAccountAnalysisSetupErrors>>,
  accountAnalysisWarnings: Set<string>
): StatusFinding[] {
  const findings: StatusFinding[] = [];
  for (const report of snapshot.facilityReports) {
    const facility = snapshot.facilities.find(item => item.guid === report.facilityId);
    if (!facility) continue;
    const errors = getFacilityReportErrors(report, [...facilityAnalysisErrors.values()]);
    const validType = ['analysis', 'overview', 'emissionFactors', 'savings', 'modeling', 'costSavings', 'dataQuality'].includes(report.facilityReportType);
    const reportErrors = validType ? errors : { ...errors, hasErrors: true, missingReportType: true };
    const entity = facilityReportEntity(report, facility);
    findings.push(...reportErrorFindings(entity, reportErrors));
    if (!reportErrors.hasErrors && report.analysisItemId && facilityAnalysisWarnings.has(report.analysisItemId)) {
      findings.push(makeFinding('report.analysis.warning', 'warning', 'quality', entity));
    }
  }
  for (const report of snapshot.accountReports) {
    const errors = getAccountReportErrors(report, [...accountAnalysisErrors.values()]);
    const validType = ['betterPlants', 'dataOverview', 'performance', 'betterClimate', 'analysis', 'accountEmissionFactors', 'accountSavings'].includes(report.reportType);
    const reportErrors = validType ? errors : { ...errors, hasErrors: true, missingReportType: true };
    const entity = accountReportEntity(report, snapshot.account);
    findings.push(...reportErrorFindings(entity, reportErrors));
    const analysisId = report.analysisReportSetup?.analysisItemId || report.betterPlantsReportSetup?.analysisItemId || report.performanceReportSetup?.analysisItemId || report.accountSavingsReportSetup?.analysisItemId;
    if (!reportErrors.hasErrors && analysisId && accountAnalysisWarnings.has(analysisId)) {
      findings.push(makeFinding('report.analysis.warning', 'warning', 'quality', entity));
    }
  }
  return findings;
}

function reportErrorFindings(entity: StatusEntityRef, errors: any): StatusFinding[] {
  const findings: StatusFinding[] = [];
  const configurationReasons = reasonKeys(errors, [
    'missingName', 'missingReportType', 'missingReportYear', 'missingBaselineYear', 'missingStartDate', 'missingEndDate'
  ]);
  if (configurationReasons.length) findings.push(makeFinding('report.configuration.invalid', 'error', 'configuration', entity, { reasons: configurationReasons }));
  const dateReasons = reasonKeys(errors, ['invalidDateRange', 'baselineAfterReportYear']);
  if (dateReasons.length) findings.push(makeFinding('report.dates.invalid', 'error', 'configuration', entity, { reasons: dateReasons }));
  if (errors.analysisHasErrors) findings.push(makeFinding('report.analysis.invalid', 'error', 'readiness', entity));
  if (errors.isDataComplete === false || errors.missingSelection) findings.push(makeFinding('report.data.incomplete', 'error', 'completeness', entity));
  return findings;
}

function completeGroupErrors(
  group: AnalysisGroup,
  analysis: IdbAnalysisItem,
  calculated: GroupAnalysisErrors,
  snapshot: AccountWorkspaceSnapshot,
  calendarizedMeters: readonly CalanderizedMeter[]
): GroupAnalysisErrors {
  if (group.analysisType === 'skip' || group.analysisType === 'skipAnalysis') return calculated;
  const errors = { ...calculated };
  const groupMeters = snapshot.meters.filter(meter => meter.facilityId === analysis.facilityId && meter.groupId === group.idbGroupId && !meter.noLongerInUse);
  const groupCalendarized = calendarizedMeters.filter(item => item.meter.facilityId === analysis.facilityId && item.meter.groupId === group.idbGroupId && !item.meter.noLongerInUse);
  const facilityPredictorData = snapshot.predictorData.filter(item => item.facilityId === analysis.facilityId);

  errors.missingGroupMeters = groupMeters.length === 0;
  if (group.analysisType !== 'absoluteEnergyConsumption') {
    errors.missingProductionVariables = !group.predictorVariables?.some(variable => variable.productionInAnalysis);
  }
  if (group.analysisType === 'regression') {
    errors.missingRegressionConstant = !validNumber(group.regressionConstant);
    errors.missingRegressionPredictorCoef = (group.predictorVariables ?? [])
      .some(variable => variable.productionInAnalysis && !validNumber(variable.regressionCoefficient));
    if (group.isGeneratedModel) {
      errors.missingRegressionModelYear = !validNumber(group.regressionModelYear);
      const selectedModel = group.models?.find(model => model.modelId === group.selectedModelId);
      errors.missingRegressionModelSelection = !selectedModel;
      errors.hasInvalidRegressionModel = selectedModel?.isValid === false;
    } else {
      errors.missingRegressionModelYear = false;
      errors.missingRegressionModelStartMonth = !validNumber(group.regressionModelStartMonth);
      errors.missingRegressionStartYear = !validNumber(group.regressionStartYear);
      errors.missingRegressionModelEndMonth = !validNumber(group.regressionModelEndMonth);
      errors.missingRegressionEndYear = !validNumber(group.regressionEndYear);
      const datesComplete = !errors.missingRegressionModelStartMonth && !errors.missingRegressionStartYear
        && !errors.missingRegressionModelEndMonth && !errors.missingRegressionEndYear;
      errors.isDateRangeValid = datesComplete && checkDateRangeValidity(group);
      errors.isTwelveMonthSelected = datesComplete && checkTwelveMonthSelection(group);
      errors.allMeterReadingsPresent = datesComplete && groupCalendarized.length > 0
        && validateMeterDataForSelectedDates(group, [...groupCalendarized]);
      errors.allPredictorReadingsPresent = datesComplete
        && validatePredictorDataForSelectedDates(group, [...facilityPredictorData]);
      errors.invalidModelDateSelection = !errors.isDateRangeValid || !errors.isTwelveMonthSelected
        || !errors.allMeterReadingsPresent || !errors.allPredictorReadingsPresent;
    }
  } else if (group.analysisType === 'energyIntensity' || group.analysisType === 'modifiedEnergyIntensity') {
    errors.noProductionVariables = !(group.predictorVariables ?? []).some(variable => variable.production);
  }
  if (group.analysisType === 'modifiedEnergyIntensity') {
    errors.invalidMonthlyBaseload = !!group.specifiedMonthlyPercentBaseload
      && (group.monthlyPercentBaseload?.length !== 12 || group.monthlyPercentBaseload.some(item => !validNumber(item.percent)));
    errors.invalidAverageBaseload = !group.specifiedMonthlyPercentBaseload && !validNumber(group.averagePercentBaseload);
  }
  if (analysis.hasBanking && group.applyBanking) {
    errors.missingBankingBaselineYear = !validNumber(group.newBaselineYear);
    errors.missingBankingAppliedYear = !validNumber(group.bankedAnalysisYear);
    errors.invalidBankingYears = !errors.missingBankingBaselineYear && !errors.missingBankingAppliedYear
      && group.bankedAnalysisYear >= group.newBaselineYear;
  }
  errors.hasRegressionErrors = errors.missingRegressionConstant || errors.missingRegressionModelYear
    || errors.missingRegressionModelStartMonth || errors.missingRegressionStartYear
    || errors.missingRegressionModelEndMonth || errors.missingRegressionEndYear
    || errors.invalidModelDateSelection || errors.missingRegressionModelSelection || errors.missingRegressionPredictorCoef;
  errors.hasInvalidUserDefinedModel = group.analysisType === 'regression' && !group.isGeneratedModel && errors.hasRegressionErrors;
  errors.hasSetupErrors = errors.missingProductionVariables || errors.noProductionVariables || errors.invalidAverageBaseload
    || errors.invalidMonthlyBaseload || errors.missingGroupMeters || errors.missingBankingBaselineYear
    || errors.missingBankingAppliedYear || errors.invalidBankingYears || errors.hasRegressionErrors;
  errors.hasErrors = errors.hasSetupErrors;
  return errors;
}

function currencyFindings(
  kind: 'meter' | 'predictor', entity: StatusEntityRef, latest: Date | undefined, facilityLatest: Date | undefined,
  ignore: boolean | undefined, noLongerInUse: boolean | undefined, stopMonth: number | undefined, stopYear: number | undefined,
  staleness: { enabled: boolean; thresholdMonths: DataStalenessMonths }, asOfDate: Date
): StatusFinding[] {
  if (!latest || ignore) return [];
  const comparisonLatest = noLongerInUse && stopMonth != null && stopYear ? new Date(stopYear, stopMonth, 1) : facilityLatest;
  const behind = !!comparisonLatest && monthValue(latest) < monthValue(comparisonLatest);
  const stale = staleness.enabled && !noLongerInUse && isOlderThanThreshold(latest, asOfDate, staleness.thresholdMonths);
  const evidence = {
    latestPeriod: monthKey(latest), thresholdMonths: staleness.thresholdMonths,
    ...(behind && comparisonLatest ? { facilityLatestPeriod: monthKey(comparisonLatest) } : {})
  };
  if (stale) return [makeFinding(`${kind}.currency.stale`, 'warning', 'currency', entity, evidence)];
  if (behind && comparisonLatest) return [makeFinding(`${kind}.currency.behind-facility`, 'warning', 'currency', entity, evidence)];
  return [];
}

function invalidMeterFields(meter: IdbUtilityMeter, customFuels: readonly IdbCustomFuel[]): string[] {
  const fields: string[] = [];
  const required = (value: unknown, field: string) => { if (value === undefined || value === null || String(value).trim() === '') fields.push(field); };
  required(meter.name, 'name'); required(meter.source, 'source'); required(meter.startingUnit, 'startingUnit'); required(meter.energyUnit, 'energyUnit');
  if (meter.source === 'Electricity' && (!validNumber(meter.agreementType) || meter.agreementType <= 0)) fields.push('agreementType');
  if (((meter.source === 'Other Fuels' && meter.scope !== 2) || meter.source === 'Other Energy')) required(meter.fuel, 'fuel');
  if (meter.source === 'Other Fuels' && meter.scope !== 2) required(meter.phase, 'phase');
  if (checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope) && !hasValidHeatCapacity(meter, customFuels)) fields.push('heatCapacity');
  if (checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope) && !validNonNegative(meter.siteToSource)) fields.push('siteToSource');
  if (meter.source === 'Water Intake') required(meter.waterIntakeType, 'waterIntakeType');
  if (meter.source === 'Water Discharge') required(meter.waterDischargeType, 'waterDischargeType');
  if (meter.scope === 2) required(meter.vehicleCategory, 'vehicleCategory');
  if (meter.scope === 2 && meter.vehicleCategory === 2) {
    required(meter.vehicleType, 'vehicleType'); required(meter.vehicleCollectionType, 'vehicleCollectionType'); required(meter.vehicleDistanceUnit, 'vehicleDistanceUnit');
    if (typeof meter.vehicleFuelEfficiency !== 'number' || !Number.isFinite(meter.vehicleFuelEfficiency) || meter.vehicleFuelEfficiency === 0) fields.push('vehicleFuelEfficiency');
  }
  if (meter.scope === 5 || meter.scope === 6) required(meter.globalWarmingPotentialOption, 'globalWarmingPotentialOption');
  if (meter.source === 'Electricity' && meter.agreementType === 5 && !validFraction(meter.greenPurchaseFraction)) fields.push('greenPurchaseFraction');
  else if (meter.greenPurchaseFraction != null && !validFraction(meter.greenPurchaseFraction)) fields.push('greenPurchaseFraction');
  meter.charges?.forEach((charge, index) => { if (!charge.name?.trim()) fields.push(`charges.${index}.name`); if (!charge.chargeType) fields.push(`charges.${index}.chargeType`); });
  return fields;
}

function meterGaps(meter: IdbUtilityMeter, readings: readonly IdbUtilityMeterData[]): string[] {
  if (meter.meterReadingDataApplication === 'fullYear') {
    const years = [...new Set(readings.map(reading => reading.year))].sort((a, b) => a - b);
    if (years.length < 2) return [];
    const present = new Set(years);
    const gaps: string[] = [];
    for (let year = years[0]; year <= years[years.length - 1]; year++) if (!present.has(year)) gaps.push(String(year));
    return gaps;
  }
  if (meter.meterReadingDataApplication !== 'fullMonth') return [];
  return missingMonths(readings.map(reading => ({ month: reading.month, year: reading.year })));
}

export function missingMeterMonths(meter: IdbUtilityMeter, readings: readonly IdbUtilityMeterData[]): Array<{ month: number; year: number }> {
  if (meter.meterReadingDataApplication !== 'fullMonth' || readings.length < 2) return [];
  const values = [...new Set(readings.map(reading => reading.year * 12 + reading.month - 1))].sort((a, b) => a - b);
  const present = new Set(values);
  const gaps: Array<{ month: number; year: number }> = [];
  for (let value = values[0]; value <= values[values.length - 1]; value++) {
    if (!present.has(value)) gaps.push({ month: value % 12 + 1, year: Math.floor(value / 12) });
  }
  return gaps;
}

function duplicateMeterDates(readings: readonly IdbUtilityMeterData[]): string[] {
  const counts = new Map<string, number>();
  readings.forEach(reading => {
    const day = reading.day == null ? 'missing' : String(reading.day).padStart(2, '0');
    const key = `${reading.year}-${String(reading.month).padStart(2, '0')}-${day}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key).sort();
}

function missingMonths(entries: readonly { month: number; year: number }[]): string[] {
  if (entries.length < 2) return [];
  const values = [...new Set(entries.map(entry => entry.year * 12 + entry.month - 1))].sort((a, b) => a - b);
  const present = new Set(values);
  const gaps: string[] = [];
  for (let value = values[0]; value <= values[values.length - 1]; value++) {
    if (!present.has(value)) gaps.push(monthKey(new Date(Math.floor(value / 12), value % 12, 1)));
  }
  return gaps;
}

function monthCounts(entries: readonly { month: number; year: number }[]): Map<string, number> {
  const counts = new Map<string, number>();
  entries.forEach(entry => { const key = `${entry.year}-${entry.month}`; counts.set(key, (counts.get(key) ?? 0) + 1); });
  return counts;
}

function latestMeterDate(readings: readonly IdbUtilityMeterData[]): Date | undefined {
  return readings.reduce<Date | undefined>((latest, reading) => {
    const date = new Date(reading.year, reading.month - 1, reading.day ?? 1);
    return !latest || date > latest ? date : latest;
  }, undefined);
}

function latestMonth(entries: readonly { month: number; year: number }[]): Date | undefined {
  return entries.reduce<Date | undefined>((latest, entry) => {
    const date = new Date(entry.year, entry.month - 1, 1);
    return !latest || date > latest ? date : latest;
  }, undefined);
}

function latestCalendarizedMonth(meters: readonly CalanderizedMeter[]): Date | undefined {
  return meters.flatMap(meter => meter.monthlyData).reduce<Date | undefined>((latest, data: MonthlyData) => {
    const date = new Date(data.year, data.monthNumValue, 1);
    return !latest || date > latest ? date : latest;
  }, undefined);
}

function effectiveStaleness(account: IdbAccount, facility: IdbFacility): { enabled: boolean; thresholdMonths: DataStalenessMonths } {
  const facilitySettings: DataStalenessSettings | undefined = facility.dataStalenessSettings;
  const accountSettings: DataStalenessSettings | undefined = account.dataStalenessSettings;
  const settings = facilitySettings?.useAccountSettings ? accountSettings : facilitySettings ?? accountSettings;
  return { enabled: settings?.enabled ?? true, thresholdMonths: settings?.thresholdMonths ?? DEFAULT_DATA_STALENESS_MONTHS };
}

export function isOlderThanThreshold(date: Date, asOfDate: Date, thresholdMonths: number): boolean {
  const threshold = new Date(asOfDate.getFullYear(), asOfDate.getMonth() - thresholdMonths, asOfDate.getDate());
  return date < threshold;
}

function groupInputIds(group: AnalysisGroup, meters: readonly IdbUtilityMeter[]): { meterIds: Set<string>; predictorIds: Set<string> } {
  const meterIds = new Set(meters.filter(meter => meter.groupId === group.idbGroupId && !meter.noLongerInUse).map(meter => meter.guid));
  const predictorIds = new Set<string>();
  if (group.analysisType === 'regression' && group.isGeneratedModel) {
    const model: JStatRegressionModel | undefined = group.models?.find(item => item.modelId === group.selectedModelId);
    model?.predictorVariables.forEach(variable => { if (variable.id) predictorIds.add(variable.id); });
  } else {
    group.predictorVariables?.forEach(variable => { if (variable.productionInAnalysis && variable.id) predictorIds.add(variable.id); });
  }
  return { meterIds, predictorIds };
}

function groupErrorReasons(errors: GroupAnalysisErrors): string[] {
  return reasonKeys(errors, [
    'missingProductionVariables', 'missingRegressionConstant', 'missingRegressionModelYear', 'missingRegressionModelStartMonth',
    'missingRegressionStartYear', 'missingRegressionModelEndMonth', 'missingRegressionEndYear', 'invalidModelDateSelection',
    'missingRegressionModelSelection', 'missingRegressionPredictorCoef', 'invalidAverageBaseload', 'invalidMonthlyBaseload',
    'noProductionVariables', 'missingGroupMeters', 'missingBankingBaselineYear', 'missingBankingAppliedYear', 'invalidBankingYears'
  ]);
}

function analysisErrorReasons(errors: AnalysisSetupErrors, baselineUnavailable: boolean): string[] {
  const reasons = reasonKeys(errors, [
    'missingName', 'noGroups', 'missingBaselineYear', 'baselineYearAfterMeterDataEnd', 'baselineYearBeforeMeterDataStart', 'bankingError'
  ]);
  if (baselineUnavailable && !errors.missingBaselineYear) reasons.push('baselineUnavailable');
  return [...new Set(reasons)];
}

function accountAnalysisErrorReasons(errors: ReturnType<typeof getAccountAnalysisSetupErrors>): string[] {
  return reasonKeys(errors, ['missingName', 'missingBaselineYear', 'facilitiesSelectionsInvalid']);
}

function reasonKeys(value: any, keys: readonly string[]): string[] {
  return keys.filter(key => value?.[key] === true);
}

function deduplicateFindings(findings: readonly StatusFinding[]): StatusFinding[] {
  return [...new Map(findings.map(finding => [finding.id, finding])).values()];
}

function hasValidHeatCapacity(meter: IdbUtilityMeter, customFuels: readonly IdbCustomFuel[]): boolean {
  if (validNonNegative(meter.heatCapacity)) return true;
  if (!isMissingValue(meter.heatCapacity) || !meter.source || !meter.startingUnit || !meter.energyUnit) return false;
  try {
    const fuelOptions = getFuelTypeOptions(
      meter.source,
      meter.phase,
      [...customFuels],
      meter.scope,
      meter.vehicleCategory,
      meter.vehicleType
    );
    const selectedFuel = fuelOptions.find(option => option.value === (meter.scope === 2 ? meter.vehicleFuel : meter.fuel));
    return validNonNegative(getHeatingCapacity(meter.source, meter.startingUnit, meter.energyUnit, selectedFuel));
  } catch {
    return false;
  }
}

function isMissingValue(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function validNonNegative(value: unknown): boolean {
  if (isMissingValue(value)) return false;
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0;
}
function validFraction(value: unknown): boolean { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1; }
function validNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function monthValue(date: Date): number { return date.getFullYear() * 12 + date.getMonth(); }
function monthKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }

function accountEntity(account: IdbAccount): StatusEntityRef { return { kind: 'account', guid: account.guid, name: account.name || 'Untitled account', accountGuid: account.guid }; }
function facilityEntity(account: IdbAccount, facility: IdbFacility): StatusEntityRef { return { kind: 'facility', guid: facility.guid, name: facility.name || 'Untitled facility', accountGuid: account.guid, facilityGuid: facility.guid }; }
function meterEntity(meter: IdbUtilityMeter): StatusEntityRef { return { kind: 'meter', guid: meter.guid, name: meter.name || 'Untitled meter', accountGuid: meter.accountId, facilityGuid: meter.facilityId }; }
function predictorEntity(predictor: IdbPredictor): StatusEntityRef { return { kind: 'predictor', guid: predictor.guid, name: predictor.name || 'Untitled predictor', accountGuid: predictor.accountId, facilityGuid: predictor.facilityId }; }
function facilityAnalysisEntity(analysis: any, facility: IdbFacility): StatusEntityRef { return { kind: 'facility-analysis', guid: analysis.guid, name: analysis.name || 'Untitled analysis', accountGuid: analysis.accountId, facilityGuid: facility.guid }; }
function accountAnalysisEntity(analysis: any, account: IdbAccount): StatusEntityRef { return { kind: 'account-analysis', guid: analysis.guid, name: analysis.name || 'Untitled analysis', accountGuid: account.guid }; }
function analysisGroupEntity(analysis: IdbAnalysisItem, group: AnalysisGroup, facility: IdbFacility): StatusEntityRef { return { kind: 'analysis-group', guid: `${analysis.guid}:${group.idbGroupId}`, name: `Analysis group ${group.idbGroupId}`, accountGuid: analysis.accountId, facilityGuid: facility.guid }; }
function facilityReportEntity(report: any, facility: IdbFacility): StatusEntityRef { return { kind: 'facility-report', guid: report.guid, name: report.name || 'Untitled report', accountGuid: report.accountId, facilityGuid: facility.guid }; }
function accountReportEntity(report: any, account: IdbAccount): StatusEntityRef { return { kind: 'account-report', guid: report.guid, name: report.name || 'Untitled report', accountGuid: account.guid }; }

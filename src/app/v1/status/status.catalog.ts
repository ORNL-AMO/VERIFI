import { StatusDestination, StatusFinding, StatusItem, StatusRuleCode, StatusSeverity } from './status.models';

interface StatusRulePresentation {
  readonly title: string;
  readonly description: (finding: StatusFinding) => string;
  readonly todo: boolean;
  readonly destination: (finding: StatusFinding) => StatusDestination;
}

const unavailable = (): StatusDestination => ({ kind: 'unavailable' });
const evidenceValues = (finding: StatusFinding, key: string): string[] => {
  const value = finding.evidence[key];
  return (Array.isArray(value) ? value : [value]).filter(item => item !== undefined && item !== null).map(String);
};
const evidenceList = (finding: StatusFinding, key: string): string => evidenceValues(finding, key).map(evidenceLabel).filter(unique).join(', ');

const RULES: Record<StatusRuleCode, StatusRulePresentation> = {
  'account.configuration.default-name': {
    title: 'Finish account setup', description: () => 'Give this account a meaningful name and confirm its profile settings.', todo: true,
    destination: finding => ({ kind: 'account-settings', accountGuid: finding.entity.accountGuid, detail: 'profile' })
  },
  'account.facilities.missing': {
    title: 'Add a facility', description: () => 'This account needs at least one facility before facility data can be managed.', todo: true,
    destination: finding => ({ kind: 'account-settings', accountGuid: finding.entity.accountGuid, detail: 'portfolio' })
  },
  'facility.meters.missing': {
    title: 'Add utility meters', description: finding => `${finding.entity.name} has no utility meters.`, todo: true,
    destination: finding => ({ kind: 'facility-data', facilityGuid: finding.entity.guid, detail: 'meters' })
  },
  'facility.meter-groups.missing': {
    title: 'Add meter groups', description: finding => `${finding.entity.name} has meters but no meter groups.`, todo: true,
    destination: finding => ({ kind: 'facility-data', facilityGuid: finding.entity.guid, detail: 'meter-grouping' })
  },
  'facility.predictors.missing': {
    title: 'Add predictors', description: finding => `${finding.entity.name} has no predictors.`, todo: true,
    destination: finding => ({ kind: 'facility-data', facilityGuid: finding.entity.guid, detail: 'predictors' })
  },
  'meter.configuration.invalid': {
    title: 'Complete meter setup', description: finding => `Review these meter settings: ${evidenceList(finding, 'fields')}.`, todo: true,
    destination: meterTab('settings')
  },
  'meter.data.missing': { title: 'Add meter readings', description: () => 'No readings have been entered for this meter.', todo: true, destination: meterTab('readings') },
  'meter.data.duplicate-date': { title: 'Resolve duplicate readings', description: finding => `Duplicate reading dates: ${evidenceValues(finding, 'dates').map(formatDateKey).join(', ')}.`, todo: true, destination: meterTab('readings') },
  'meter.data.negative': { title: 'Review negative readings', description: finding => `${finding.evidence.count} reading(s) contain negative values that are not allowed.`, todo: true, destination: meterTab('readings') },
  'meter.data.gap': { title: 'Fill missing meter data', description: finding => `${finding.evidence.count} period(s) are missing between the first and last entry.`, todo: true, destination: meterTab('readings') },
  'meter.calendarization.missing': { title: 'Select a calendarization method', description: () => 'A calendarization method is required to assign usage to reporting months.', todo: true, destination: meterTab('settings') },
  'meter.currency.stale': { title: 'Update stale meter data', description: staleDescription, todo: true, destination: meterTab('readings') },
  'meter.currency.behind-facility': { title: 'Bring meter data current', description: finding => `Meter data ends ${formatPeriod(finding.evidence.latestPeriod)}, while facility data runs through ${formatPeriod(finding.evidence.facilityLatestPeriod)}.`, todo: true, destination: meterTab('readings') },
  'meter.quality.consumption-outlier': { title: 'Review consumption outliers', description: finding => `${finding.evidence.count} consumption value(s) fall outside the expected range.`, todo: false, destination: meterTab('quality') },
  'meter.quality.cost-outlier': { title: 'Review cost outliers', description: finding => `${finding.evidence.count} cost value(s) fall outside the expected range.`, todo: false, destination: meterTab('quality') },
  'predictor.data.missing': { title: 'Add predictor data', description: () => 'No data has been entered for this predictor.', todo: true, destination: predictorTab('readings') },
  'predictor.data.duplicate-month': { title: 'Resolve duplicate predictor data', description: finding => `${finding.evidence.count} month(s) contain duplicate entries.`, todo: true, destination: predictorTab('readings') },
  'predictor.data.gap': { title: 'Fill missing predictor data', description: finding => `${finding.evidence.count} month(s) are missing between the first and last entry.`, todo: true, destination: predictorTab('readings') },
  'predictor.data.negative': { title: 'Review negative predictor data', description: finding => `${finding.evidence.count} negative value(s) require review.`, todo: true, destination: predictorTab('readings') },
  'predictor.currency.stale': { title: 'Update stale predictor data', description: staleDescription, todo: true, destination: predictorTab('readings') },
  'predictor.currency.behind-facility': { title: 'Bring predictor data current', description: finding => `Predictor data ends ${formatPeriod(finding.evidence.latestPeriod)}, while facility data runs through ${formatPeriod(finding.evidence.facilityLatestPeriod)}.`, todo: true, destination: predictorTab('readings') },
  'predictor.weather.warning': { title: 'Review weather data', description: () => 'Some weather entries contain incomplete or revised source data.', todo: true, destination: predictorTab('readings') },
  'predictor.quality.outlier': { title: 'Review predictor outliers', description: finding => `${finding.evidence.count} predictor value(s) fall outside the expected range.`, todo: false, destination: predictorTab('quality') },
  'analysis.configuration.invalid': { title: 'Complete analysis setup', description: finding => `Review: ${evidenceList(finding, 'reasons')}.`, todo: true, destination: unavailable },
  'analysis-group.setup.invalid': { title: 'Complete analysis group setup', description: finding => `Review: ${evidenceList(finding, 'reasons')}.`, todo: true, destination: unavailable },
  'analysis-group.model.invalid': { title: 'Review regression model', description: () => 'The selected regression model does not pass its validity checks.', todo: true, destination: unavailable },
  'analysis-group.inputs.invalid': { title: 'Review analysis inputs', description: () => 'One or more included meters or predictors has setup or data errors.', todo: true, destination: unavailable },
  'account-analysis.configuration.invalid': { title: 'Complete account analysis setup', description: finding => `Review: ${evidenceList(finding, 'reasons')}.`, todo: true, destination: unavailable },
  'account-analysis.children.warning': { title: 'Review facility analyses', description: () => 'One or more included facility analyses has warnings.', todo: true, destination: unavailable },
  'report.configuration.invalid': { title: 'Complete report setup', description: finding => `Review: ${evidenceList(finding, 'reasons')}.`, todo: true, destination: unavailable },
  'report.dates.invalid': { title: 'Correct report dates', description: finding => `Review: ${evidenceList(finding, 'reasons')}.`, todo: true, destination: unavailable },
  'report.analysis.invalid': { title: 'Select a valid analysis', description: () => 'This report requires an existing analysis without setup errors.', todo: true, destination: unavailable },
  'report.data.incomplete': { title: 'Complete report data selection', description: () => 'The report source data or selection is incomplete.', todo: true, destination: unavailable },
  'report.analysis.warning': { title: 'Review the linked analysis', description: () => 'The linked analysis has warnings that may affect this report.', todo: true, destination: unavailable }
};

export function presentFinding(finding: StatusFinding): StatusItem {
  const presentation = RULES[finding.code];
  return { ...finding, title: presentation.title, description: presentation.description(finding), todo: presentation.todo, destination: presentation.destination(finding) };
}

export function presentFindings(findings: readonly StatusFinding[]): StatusItem[] {
  return findings.map(presentFinding).sort(compareStatusItems);
}

export function todoItems(findings: readonly StatusFinding[]): StatusItem[] {
  return presentFindings(findings).filter(item => item.todo && (item.severity === 'error' || item.severity === 'warning'));
}

export function severityLabel(severity: StatusSeverity): string {
  return severity === 'error' ? 'Error' : severity === 'warning' ? 'Warning' : 'Information';
}

function meterTab(tab: 'settings' | 'readings' | 'quality'): (finding: StatusFinding) => StatusDestination {
  return finding => ({ kind: 'meter-tab', facilityGuid: finding.entity.facilityGuid!, meterGuid: finding.entity.guid, tab });
}

function predictorTab(tab: 'settings' | 'readings' | 'quality'): (finding: StatusFinding) => StatusDestination {
  return finding => ({ kind: 'predictor-tab', facilityGuid: finding.entity.facilityGuid!, predictorGuid: finding.entity.guid, tab });
}

function compareStatusItems(first: StatusItem, second: StatusItem): number {
  const severityOrder: Record<StatusSeverity, number> = { error: 0, warning: 1, information: 2 };
  return severityOrder[first.severity] - severityOrder[second.severity]
    || compareText(first.entity.name, second.entity.name)
    || compareText(first.code, second.code);
}

function compareText(first: string, second: string): number {
  return first === second ? 0 : first < second ? -1 : 1;
}

const EVIDENCE_LABELS: Readonly<Record<string, string>> = {
  name: 'name', source: 'source', startingUnit: 'starting unit', energyUnit: 'energy unit', agreementType: 'agreement type',
  fuel: 'fuel', phase: 'phase', heatCapacity: 'heat capacity', siteToSource: 'site-to-source value', waterIntakeType: 'water intake type',
  waterDischargeType: 'water discharge type', vehicleCategory: 'vehicle category', vehicleType: 'vehicle type',
  vehicleCollectionType: 'vehicle collection type', vehicleDistanceUnit: 'vehicle distance unit', vehicleFuelEfficiency: 'vehicle fuel efficiency',
  globalWarmingPotentialOption: 'global warming potential', greenPurchaseFraction: 'green purchase fraction',
  missingProductionVariables: 'production variables', missingRegressionConstant: 'regression constant', missingRegressionModelYear: 'model year',
  missingRegressionModelStartMonth: 'model start month', missingRegressionStartYear: 'model start year',
  missingRegressionModelEndMonth: 'model end month', missingRegressionEndYear: 'model end year',
  invalidModelDateSelection: 'valid model date range and complete data', missingRegressionModelSelection: 'selected regression model',
  missingRegressionPredictorCoef: 'predictor coefficients', invalidAverageBaseload: 'average baseload', invalidMonthlyBaseload: 'monthly baseload',
  noProductionVariables: 'production variables', missingGroupMeters: 'group meters', missingBankingBaselineYear: 'banking baseline year',
  missingBankingAppliedYear: 'banking applied year', invalidBankingYears: 'valid banking years', noGroups: 'analysis groups',
  missingName: 'name', missingBaselineYear: 'baseline year', baselineYearAfterMeterDataEnd: 'baseline year within available data',
  baselineYearBeforeMeterDataStart: 'baseline year within available data', baselineUnavailable: 'baseline year within available complete data years',
  bankingError: 'linked banking analysis', facilitiesSelectionsInvalid: 'valid facility analysis selections', missingReportType: 'report type',
  missingReportYear: 'report year', missingStartDate: 'start date', missingEndDate: 'end date', invalidDateRange: 'date range',
  baselineAfterReportYear: 'baseline/report year order'
};

function evidenceLabel(value: string): string {
  const chargeMatch = /^charges\.(\d+)\.(name|chargeType)$/.exec(value);
  if (chargeMatch) return `charge ${Number(chargeMatch[1]) + 1} ${chargeMatch[2] === 'name' ? 'name' : 'type'}`;
  return EVIDENCE_LABELS[value] ?? value;
}

function formatPeriod(value: unknown): string {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value ?? ''));
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : String(value ?? '');
}

function formatDateKey(value: string): string {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2}|missing)$/.exec(value);
  if (!match || match[3] === 'missing') return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString('en-US');
}

function staleDescription(finding: StatusFinding): string {
  const primary = `The latest entry is ${formatPeriod(finding.evidence.latestPeriod)}; the configured threshold is ${finding.evidence.thresholdMonths} months.`;
  return finding.evidence.facilityLatestPeriod
    ? `${primary} Facility data runs through ${formatPeriod(finding.evidence.facilityLatestPeriod)}.`
    : primary;
}

function unique(value: string, index: number, values: string[]): boolean {
  return values.indexOf(value) === index;
}

export const STATUS_RULE_CODES = Object.freeze(Object.keys(RULES) as StatusRuleCode[]);

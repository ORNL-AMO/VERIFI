import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { accountReportAnalysisIsEligible } from '@data/account-workspace/account-report-setup.models';
import { singleFacilityAnalysisPairIsCurrent } from '@data/account-workspace/single-facility-analysis-pairs';
import { AnalysisReviewOwner } from '@data/models/analysis-review';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';

export interface AnalysisReportInputs {
  readonly kind?: 'account';
  readonly owner: AnalysisReviewOwner;
  readonly account: IdbAccount;
  readonly analysis: IdbAccountAnalysisItem;
  readonly facilities: readonly IdbFacility[];
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
  readonly meters: readonly IdbUtilityMeter[];
  readonly meterData: readonly IdbUtilityMeterData[];
  readonly predictors: readonly IdbPredictor[];
  readonly predictorData: readonly IdbPredictorData[];
}

export interface FacilityAnalysisReportInputs extends Omit<AnalysisReportInputs, 'kind' | 'analysis'> {
  readonly kind: 'facility';
  readonly analysis: IdbAnalysisItem;
}

export type CheckedAnalysisReportInputs = AnalysisReportInputs | FacilityAnalysisReportInputs;

export function analysisReportLinks(inputs: CheckedAnalysisReportInputs) {
  return inputs.kind === 'facility'
    ? [{ facilityId: inputs.analysis.facilityId, analysisItemId: inputs.analysis.guid }]
    : inputs.analysis.facilityAnalysisItems;
}

/** Direct facility reports never require or create a hidden account-analysis pair. */
export function buildFacilityAnalysisReportInputs(snapshot: AccountWorkspaceSnapshot, facilityGuid: string,
  analysisGuid: string): FacilityAnalysisReportInputs {
  const accountGuid = snapshot.account.guid;
  const facility = snapshot.facilities.find(item => item.accountId === accountGuid && item.guid === facilityGuid);
  const analysis = snapshot.facilityAnalyses.find(item => item.accountId === accountGuid
    && item.facilityId === facilityGuid && item.guid === analysisGuid);
  if (!facility || !analysis || !['energy', 'water'].includes(analysis.analysisCategory)) {
    throw new Error('Choose an available analysis belonging to this facility in Setup.');
  }
  if (!Number.isInteger(analysis.baselineYear) || analysis.baselineYear < 1800 || analysis.baselineYear > 9999) {
    throw new Error('Set the linked analysis baseline year before checking this report.');
  }
  const dependencies: IdbAnalysisItem[] = [];
  const visited = new Set<string>();
  let current: IdbAnalysisItem | undefined = analysis;
  while (current) {
    if (visited.has(current.guid)) throw new Error('The analysis banking dependencies contain a cycle.');
    visited.add(current.guid);
    dependencies.push(current);
    if (!current.hasBanking) break;
    current = snapshot.facilityAnalyses.find(item => item.accountId === accountGuid && item.facilityId === facilityGuid
      && item.guid === current!.bankedAnalysisItemId);
    if (!current) throw new Error('A banked analysis is unavailable. Review the analysis banking setup.');
  }
  const meters = snapshot.meters.filter(item => item.accountId === accountGuid && item.facilityId === facilityGuid);
  const meterIds = new Set(meters.map(item => item.guid));
  const predictorIds = new Set(dependencies.flatMap(item => item.groups).flatMap(group => [
    ...(group.predictorVariables ?? []), ...(group.models?.find(model => model.modelId === group.selectedModelId)?.predictorVariables ?? [])
  ]).map(variable => variable.id));
  return structuredClone({ kind: 'facility', owner: { scope: 'facility', facilityGuid, analysisGuid }, account: snapshot.account,
    analysis, facilities: [facility], facilityAnalyses: dependencies, meters,
    meterData: snapshot.meterData.filter(item => item.accountId === accountGuid && meterIds.has(item.meterId)),
    predictors: snapshot.predictors.filter(item => item.accountId === accountGuid && item.facilityId === facilityGuid && predictorIds.has(item.guid)),
    predictorData: snapshot.predictorData.filter(item => item.accountId === accountGuid && item.facilityId === facilityGuid && predictorIds.has(item.predictorId)) });
}

/** Detached inputs shared by checks and reports; never repair stored references while reading. */
export function buildAnalysisReportInputs(snapshot: AccountWorkspaceSnapshot, analysisGuid: string): AnalysisReportInputs {
  const accountGuid = snapshot.account.guid;
  const analysis = snapshot.accountAnalyses.find(item => item.accountId === accountGuid && item.guid === analysisGuid);
  if (!analysis || !accountReportAnalysisIsEligible(analysis)) throw new Error('Choose an available source-energy or water analysis in Setup.');
  if (!Number.isInteger(analysis.baselineYear)) throw new Error('Set the linked analysis baseline year before checking this report.');
  const ownedFacilities = snapshot.facilities.filter(item => item.accountId === accountGuid);
  const selected = analysis.facilityAnalysisItems.filter(link => link.analysisItemId && link.analysisItemId !== 'skip');
  if (!selected.length) throw new Error('Select at least one facility analysis before checking this report.');
  const facilities: IdbFacility[] = [];
  const dependencies = new Map<string, IdbAnalysisItem>();
  for (const link of selected) {
    const facility = ownedFacilities.find(item => item.guid === link.facilityId);
    let item = snapshot.facilityAnalyses.find(candidate => candidate.accountId === accountGuid
      && candidate.facilityId === link.facilityId && candidate.guid === link.analysisItemId);
    if (!facility || !item) throw new Error('A linked facility analysis is unavailable. Review the analysis selections.');
    if (item.analysisCategory !== analysis.analysisCategory) {
      throw new Error('The linked facility analysis category no longer matches. Review the analysis selections.');
    }
    facilities.push(facility);
    const visited = new Set<string>();
    while (item) {
      if (visited.has(item.guid)) throw new Error('The analysis banking dependencies contain a cycle.');
      visited.add(item.guid);
      dependencies.set(item.guid, item);
      if (!item.hasBanking || !item.bankedAnalysisItemId) break;
      item = snapshot.facilityAnalyses.find(candidate => candidate.accountId === accountGuid
        && candidate.facilityId === facility.guid && candidate.guid === item.bankedAnalysisItemId);
      if (!item) throw new Error('A banked analysis is unavailable. Review the analysis banking setup.');
    }
  }
  let owner: AnalysisReviewOwner = { scope: 'account', analysisGuid: analysis.guid };
  if (snapshot.account.isSingleFacilityCompany && ownedFacilities.length === 1) {
    const facilityAnalysis = dependencies.get(selected[0].analysisItemId)!;
    if (selected.length !== 1 || !singleFacilityAnalysisPairIsCurrent(analysis, facilities[0], facilityAnalysis)) {
      throw new Error('Refresh this report’s analysis link in Setup before checking it.');
    }
    owner = { scope: 'facility', facilityGuid: facilities[0].guid, analysisGuid: facilityAnalysis.guid };
  }
  const facilityIds = new Set(facilities.map(item => item.guid));
  // Keep all meters in selected facilities: water reports can include additional intake.
  const meters = snapshot.meters.filter(item => item.accountId === accountGuid && facilityIds.has(item.facilityId));
  const meterIds = new Set(meters.map(item => item.guid));
  const predictorIds = new Set([...dependencies.values()].flatMap(item => item.groups)
    .flatMap(group => [...(group.predictorVariables ?? []), ...(group.models?.find(model => model.modelId === group.selectedModelId)?.predictorVariables ?? [])])
    .map(variable => variable.id));
  return structuredClone({ owner, account: snapshot.account, analysis, facilities,
    facilityAnalyses: [...dependencies.values()], meters,
    meterData: snapshot.meterData.filter(item => item.accountId === accountGuid && meterIds.has(item.meterId)),
    predictors: snapshot.predictors.filter(item => item.accountId === accountGuid && facilityIds.has(item.facilityId) && predictorIds.has(item.guid)),
    predictorData: snapshot.predictorData.filter(item => item.accountId === accountGuid && facilityIds.has(item.facilityId) && predictorIds.has(item.predictorId)) });
}

export function reportYears(baselineYear: number, reportYear: number, includeAllYears: boolean): readonly number[] {
  if (!Number.isInteger(baselineYear) || !Number.isInteger(reportYear) || baselineYear < 1800 || reportYear > 9999 || reportYear <= baselineYear) {
    throw new Error('Choose a report year after the linked analysis baseline year.');
  }
  return Array.from({ length: includeAllYears ? reportYear - baselineYear : 1 }, (_, index) => reportYear - index);
}

/** Bound total work by the loaded history, including a fiscal/backward-reading boundary year. */
export function assertAnalysisReportYears(inputs: CheckedAnalysisReportInputs, years: readonly number[]): void {
  const dataYears = inputs.meterData.map(item => item.year).filter(year => Number.isInteger(year) && year >= 1800 && year <= 9999);
  const first = dataYears.reduce((value, year) => Math.min(value, year), Infinity);
  const last = dataYears.reduce((value, year) => Math.max(value, year), -Infinity);
  if (!years.length || new Set(years).size !== years.length || !dataYears.length
    || inputs.analysis.baselineYear < first - 1 || years.length > last - first + 2
    || years.some(year => !Number.isInteger(year) || year < inputs.analysis.baselineYear
      || (inputs.kind !== 'facility' && year === inputs.analysis.baselineYear) || year > last + 1)) {
    throw new Error('The reporting periods fall outside the available meter history. Review the analysis baseline and report year.');
  }
}

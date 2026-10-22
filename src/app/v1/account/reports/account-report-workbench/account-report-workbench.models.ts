import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { ReportAnalysisSelection, accountReportAnalysisGuid } from '@data/account-workspace/account-report-setup.models';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { ReportType } from '@data/models/constantsAndTypes';

export interface ReportAnalysisOption {
  readonly value: string;
  readonly label: string;
  readonly selection: ReportAnalysisSelection;
  readonly unavailable?: boolean;
}
export const reportAnalysisToken = (selection: ReportAnalysisSelection): string => selection.scope === 'account'
  ? JSON.stringify(['account', selection.analysisGuid]) : JSON.stringify(['facility', selection.facilityGuid, selection.analysisGuid]);
export function hasAccountReportDataChecks(type: ReportType): boolean { return ['betterPlants', 'performance', 'accountSavings'].includes(type); }
export function savedReportAnalysisChoice(report: IdbAccountReport, snapshot: AccountWorkspaceSnapshot): ReportAnalysisSelection | null {
  const guid = accountReportAnalysisGuid(report);
  if (!guid) return null;
  const ownedFacilities = snapshot.facilities.filter(item => item.accountId === snapshot.account.guid);
  const linked = snapshot.accountAnalyses.find(item => item.guid === guid && item.accountId === snapshot.account.guid);
  const link = linked?.facilityAnalysisItems?.length === 1 ? linked.facilityAnalysisItems[0] : undefined;
  if (snapshot.account.isSingleFacilityCompany && ownedFacilities.length === 1 && link?.facilityId === ownedFacilities[0].guid && link.analysisItemId && link.analysisItemId !== 'skip') {
    return { scope: 'facility', facilityGuid: link.facilityId, analysisGuid: link.analysisItemId };
  }
  return { scope: 'account', analysisGuid: guid };
}
export function reportAnalysisOptions(report: IdbAccountReport, snapshot: AccountWorkspaceSnapshot): readonly ReportAnalysisOption[] {
  const accountGuid = snapshot.account.guid;
  const facilities = snapshot.facilities.filter(item => item.accountId === accountGuid);
  const single = snapshot.account.isSingleFacilityCompany === true && facilities.length === 1;
  const options: ReportAnalysisOption[] = single
    ? snapshot.facilityAnalyses.filter(item => item.accountId === accountGuid && item.facilityId === facilities[0].guid && item.energyIsSource)
      .map(item => ({ selection: { scope: 'facility' as const, facilityGuid: item.facilityId, analysisGuid: item.guid }, name: item.name, category: item.analysisCategory, baseline: item.baselineYear }))
      .map(item => ({ selection: item.selection, value: reportAnalysisToken(item.selection), label: `${item.name || 'Untitled analysis'} · ${item.category} · Baseline ${item.baseline ?? 'not set'}` }))
    : snapshot.accountAnalyses.filter(item => item.accountId === accountGuid && item.energyIsSource)
      .map(item => { const selection = { scope: 'account' as const, analysisGuid: item.guid }; return { selection, value: reportAnalysisToken(selection), label: `${item.name || 'Untitled analysis'} · ${item.analysisCategory} · Baseline ${item.baselineYear ?? 'not set'}` }; });
  options.sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value));
  const saved = savedReportAnalysisChoice(report, snapshot);
  if (saved && !options.some(option => option.value === reportAnalysisToken(saved))) {
    options.unshift({ selection: saved, value: reportAnalysisToken(saved), label: 'Saved analysis unavailable or ineligible', unavailable: true });
  }
  return options;
}

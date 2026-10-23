import { Injectable } from '@angular/core';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { AccountWorkspaceSnapshot } from '../account-workspace.models';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { ANALYSIS_DATA_CHECKS_VERSION, AnalysisDataCheckReview } from '@data/models/analysis-review';
import { AnalysisReportInputs, buildAnalysisReportInputs, reportYears } from '@domain/reports/analysis-report-inputs';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { analysisReviewContent } from '@domain/reports/analysis-review-inputs';
import { analysisReviewFingerprint } from '@platform/reports/analysis-review-fingerprint';

export type AnalysisReviewWriteResult =
  | { readonly scope: 'account'; readonly analysis: IdbAccountAnalysisItem }
  | { readonly scope: 'facility'; readonly analysis: IdbAnalysisItem };

@Injectable({ providedIn: 'root' })
export class AnalysisReviewCommandHandler {
  constructor(private readonly transactions: IndexedDbTransactionService) { }

  async confirm(accountGuid: string, accountAnalysisGuid: string, displayed: AnalysisReportInputs, years: readonly number[]): Promise<AnalysisReviewWriteResult> {
    if (displayed.account.guid !== accountGuid || !years.length || new Set(years).size !== years.length) {
      throw new WorkspaceWriteError('validation-failed', 'The displayed analysis review is unavailable. Run Data Checks again.');
    }
    const contents = years.map(year => {
      reportYears(displayed.analysis.baselineYear, year, false);
      if (calculateAnalysisDataChecks(displayed, year).hasBlockingErrors) {
        throw new WorkspaceWriteError('validation-failed', 'Resolve blocking analysis issues before confirming review.');
      }
      return analysisReviewContent(displayed, year);
    });
    const fingerprints = await Promise.all(contents.map(content => analysisReviewFingerprint(content)));
    const reviewedAt = new Date().toISOString();
    return this.transactions.runTransaction(['accounts', 'facilities', 'accountAnalysisItems', 'analysisItems', 'utilityMeter', 'utilityMeterData', 'predictor', 'predictorData'], 'readwrite', async tx => {
      const account = (await tx.getAll<IdbAccount>('accounts')).find(item => item.guid === accountGuid);
      if (!account) throw new WorkspaceWriteError('validation-failed', 'The account is no longer available.');
      const [facilities, accountAnalyses, facilityAnalyses, meters, meterData, predictors, predictorData] = await Promise.all([
        tx.getAllByIndex<IdbFacility>('facilities', 'accountId', accountGuid),
        tx.getAllByIndex<IdbAccountAnalysisItem>('accountAnalysisItems', 'accountId', accountGuid),
        tx.getAllByIndex<IdbAnalysisItem>('analysisItems', 'accountId', accountGuid),
        tx.getAllByIndex<IdbUtilityMeter>('utilityMeter', 'accountId', accountGuid),
        tx.getAllByIndex<IdbUtilityMeterData>('utilityMeterData', 'accountId', accountGuid),
        tx.getAllByIndex<IdbPredictor>('predictor', 'accountId', accountGuid),
        tx.getAllByIndex<IdbPredictorData>('predictorData', 'accountId', accountGuid)
      ]);
      const snapshot: AccountWorkspaceSnapshot = { account, facilities, accountAnalyses, facilityAnalyses, meters, meterData, predictors, predictorData,
        meterGroups: [], accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [] };
      const current = buildAnalysisReportInputs(snapshot, accountAnalysisGuid);
      if (years.some((year, index) => analysisReviewContent(current, year) !== contents[index])) {
        throw new WorkspaceWriteError('validation-failed', 'Analysis inputs changed during review. Run Data Checks again before confirming.');
      }
      const receipts: AnalysisDataCheckReview[] = years.map((reportYear, index) => ({ checksVersion: ANALYSIS_DATA_CHECKS_VERSION, reportYear,
        inputFingerprint: fingerprints[index], reviewedAt }));
      const owner = current.owner;
      const analysis = owner.scope === 'account' ? accountAnalyses.find(item => item.guid === owner.analysisGuid)!
        : facilityAnalyses.find(item => item.guid === owner.analysisGuid && item.facilityId === owner.facilityGuid)!;
      if (analysis.id === undefined) throw new WorkspaceWriteError('validation-failed', 'The analysis has no stored identity.');
      const dataCheckReviews = [...(analysis.dataCheckReviews ?? []).filter(item => item.checksVersion === ANALYSIS_DATA_CHECKS_VERSION && !years.includes(item.reportYear)), ...receipts];
      const updated = { ...analysis, dataCheckReviews };
      await tx.put(owner.scope === 'account' ? 'accountAnalysisItems' : 'analysisItems', updated);
      return owner.scope === 'account' ? { scope: 'account', analysis: updated as IdbAccountAnalysisItem } : { scope: 'facility', analysis: updated as IdbAnalysisItem };
    });
  }
}

import { Injectable } from '@angular/core';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbAccountAnalysisItem, IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { getNewIdbAccountReport, IdbAccountReport } from '@data/models/idbModels/accountReport';
import { getNewIdbFacilityReport, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { AnalysisReportUsageCommand, AnalysisUsageCommand,
  analysisReportCompatible, analysisUsageSourceKey } from '../analysis-usage.models';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { ReportCommandHandler } from './report-command-handler.service';
import { getAnalysisReportDefaults } from '../report-creation-defaults';

export interface AnalysisUsageWriteResult {
  readonly guid: string;
  readonly accountAnalyses: readonly IdbAccountAnalysisItem[];
  readonly accountReports: readonly IdbAccountReport[];
  readonly facilityReports: readonly IdbFacilityReport[];
}

/** Create records with their source analysis selected in the same native transaction. */
@Injectable({ providedIn: 'root' })
export class AnalysisUsageCommandHandler {
  constructor(private readonly transactions: IndexedDbTransactionService, private readonly reports: ReportCommandHandler) { }

  async saveReport(command: AnalysisReportUsageCommand): Promise<AnalysisUsageWriteResult> {
    return this.transactions.runTransaction(['accounts', 'facilities', 'analysisItems', 'accountAnalysisItems',
      'accountReports', 'facilityReports', 'utilityMeterGroups', 'utilityMeter', 'predictor'], 'readwrite', async tx => {
      const { account, facilities, source } = await this.readSource(tx, command);
      const destination = command.report;
      if (!analysisReportCompatible(destination.scope, destination.type, source)) invalid('This report type cannot use the selected analysis.');
      const singleFacility = account.isSingleFacilityCompany === true && facilities.length === 1;
      if (destination.scope === 'account' && (command.source.scope === 'facility' ? !singleFacility : singleFacility)) {
        invalid('Choose an analysis with the correct ownership for this report.');
      }
      const groups = await tx.getAllByIndex<IdbUtilityMeterGroup>('utilityMeterGroups', 'accountId', account.guid);
      const target = command.target;
      if (destination.scope === 'account') {
        const reports = await tx.getAllByIndex<IdbAccountReport>('accountReports', 'accountId', account.guid);
        if (reports.some(item => item.guid === target.guid)) invalid('This report has already been created. Refresh the workspace before continuing.');
        const report = { ...getNewIdbAccountReport(account, facilities, groups), guid: target.guid,
          name: requireName(target.name), reportType: destination.type };
        report.id = Number(await tx.add('accountReports', report));
        const result = await this.reports.applyAccountReportSetup(tx, report.guid, {
          analysis: command.source.scope === 'account'
            ? { scope: 'account', analysisGuid: source.guid }
            : { scope: 'facility', facilityGuid: command.source.facilityGuid, analysisGuid: source.guid }
        }, account.guid);
        return { guid: result.report.guid, accountReports: [result.report], accountAnalyses: result.accountAnalyses, facilityReports: [] };
      }
      if (command.source.scope !== 'facility' || command.source.facilityGuid !== destination.facilityGuid) {
        invalid('Choose a report belonging to the analysis facility.');
      }
      const reports = await tx.getAllByIndex<IdbFacilityReport>('facilityReports', 'accountId', account.guid);
      if (reports.some(item => item.guid === target.guid)) invalid('This report has already been created. Refresh the workspace before continuing.');
      const report = { ...getNewIdbFacilityReport(destination.facilityGuid, account.guid, destination.type,
        groups.filter(group => group.facilityId === destination.facilityGuid)), guid: target.guid, name: requireName(target.name) };
      if (destination.type === 'analysis') report.analysisReportSettings = getAnalysisReportDefaults();
      report.id = Number(await tx.add('facilityReports', report));
      const updated = await this.reports.applyFacilityReportSetup(tx, destination.facilityGuid, report.guid,
        destination.type === 'dataQuality'
          ? { dataQualityReportSettings: { selectedMode: 'analysis', selectedAnalysisItemId: source.guid,
              selectedMeterIds: [], selectedPredictorIds: [] } }
          : { analysisItemId: source.guid }, account.guid);
      return { guid: updated.guid, accountReports: [], accountAnalyses: [], facilityReports: [updated] };
    });
  }

  async saveAccountAnalysis(command: AnalysisUsageCommand): Promise<AnalysisUsageWriteResult> {
    return this.transactions.runTransaction(['accounts', 'facilities', 'analysisItems', 'accountAnalysisItems'], 'readwrite', async tx => {
      const { account, facilities, source } = await this.readSource(tx, command);
      if (command.source.scope !== 'facility') invalid('Choose a facility analysis.');
      if (account.isSingleFacilityCompany === true && facilities.length === 1) invalid('Account analyses are managed through reports in this workspace.');
      const facilityGuid = command.source.facilityGuid;
      const analyses = await tx.getAllByIndex<IdbAccountAnalysisItem>('accountAnalysisItems', 'accountId', account.guid);
      const target = command.target;
      if (analyses.some(item => item.guid === target.guid)) invalid('This account analysis has already been created. Refresh the workspace before continuing.');
      if (!Number.isInteger(source.baselineYear)) invalid('Set a baseline year on the facility analysis first.');
      const updated: IdbAccountAnalysisItem = { ...getNewIdbAccountAnalysisItem(source.analysisCategory, account, facilities),
        guid: target.guid, name: requireName(target.name), baselineYear: source.baselineYear, energyIsSource: source.energyIsSource,
        facilityItemsInitialized: true, facilityAnalysisItems: facilities.map(item => ({
          facilityId: item.guid, analysisItemId: item.guid === facilityGuid ? source.guid : undefined
        })) };
      updated.id = Number(await tx.add('accountAnalysisItems', updated));
      return { guid: updated.guid, accountAnalyses: [updated], accountReports: [], facilityReports: [] };
    });
  }

  private async readSource(tx: IndexedDbTransactionContext, command: AnalysisUsageCommand) {
    if (command.target.kind !== 'new') invalid('This action can only create a new item.');
    const identity = command.source;
    const account = (await tx.getAll<IdbAccount>('accounts')).find(item => item.guid === identity.accountGuid);
    const facilities = await tx.getAllByIndex<IdbFacility>('facilities', 'accountId', identity.accountGuid);
    const source = identity.scope === 'account'
      ? (await tx.getAllByIndex<IdbAccountAnalysisItem>('accountAnalysisItems', 'accountId', identity.accountGuid)).find(item => item.guid === identity.analysisGuid)
      : (await tx.getAllByIndex<IdbAnalysisItem>('analysisItems', 'accountId', identity.accountGuid))
          .find(item => item.guid === identity.analysisGuid && item.facilityId === identity.facilityGuid);
    if (!account || !source || source.id === undefined || !['energy', 'water'].includes(source.analysisCategory)
      || identity.scope === 'facility' && !facilities.some(item => item.guid === identity.facilityGuid)) invalid('The originating analysis is no longer available.');
    assertReviewed(analysisUsageSourceKey(source), command.expectedSource);
    return { account, facilities, source };
  }
}

function requireName(name: string): string { if (!name.trim()) invalid('Enter a name.'); return name.trim(); }
function assertReviewed(current: string, expected: string): void {
  if (current !== expected) throw new WorkspaceWriteError('stale-workspace', 'The analysis settings changed. Refresh the review before saving.');
}
function invalid(message: string): never { throw new WorkspaceWriteError('validation-failed', message); }

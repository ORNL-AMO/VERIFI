/**
 * Handler for facility-report, account-report, and report group/facility cascade commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountReportDbService } from '@data/indexedDB/account-report-db.service';
import { FacilityReportsDbService } from '@data/indexedDB/facility-reports-db.service';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { AccountReportSetupChanges, AccountReportSetupResult, accountReportAnalysisGuid, accountReportAnalysisIsEligible, accountReportAnalysisSetupKey } from '../account-report-setup.models';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { buildSingleFacilityAnalysisPair, singleFacilityAnalysisPairCandidates, singleFacilityAnalysisPairIsCurrent } from '../single-facility-analysis-pairs';

@Injectable({ providedIn: 'root' })
export class ReportCommandHandler {
  constructor(
    private readonly facilityReportDb: FacilityReportsDbService,
    private readonly accountReportDb: AccountReportDbService,
    private readonly accountWorkspaceStore: AccountWorkspaceStore,
    private readonly transactions: IndexedDbTransactionService
  ) { }

  // ---------------------------------------------------------------------------
  // Facility reports
  // ---------------------------------------------------------------------------

  async addFacilityReport(report: IdbFacilityReport, activeAccountGuid: string): Promise<IdbFacilityReport> {
    this.assertOwnership(report.accountId, activeAccountGuid, 'facility report');
    return firstValueFrom(this.facilityReportDb.addWithObservable({ ...report }));
  }

  async updateFacilityReport(report: IdbFacilityReport, activeAccountGuid: string): Promise<IdbFacilityReport> {
    this.assertOwnership(report.accountId, activeAccountGuid, 'facility report');
    return firstValueFrom(this.facilityReportDb.updateWithObservable({ ...report }));
  }

  async deleteFacilityReport(report: IdbFacilityReport, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(report.accountId, activeAccountGuid, 'facility report');
    await firstValueFrom(this.facilityReportDb.deleteWithObservable(report.id));
    return report.id;
  }

  async bulkDeleteFacilityReports(reports: readonly IdbFacilityReport[], activeAccountGuid: string): Promise<number> {
    reports.forEach(report => this.assertOwnership(report.accountId, activeAccountGuid, 'facility report'));
    return this.transactions.runTransaction(['facilityReports'], 'readwrite', async transaction => {
      let deleted = 0;
      for (const report of reports) {
        if (report.id === undefined) {
          throw new WorkspaceWriteError('validation-failed', 'Facility report is missing its IndexedDB id.');
        }
        await transaction.deleteByKey('facilityReports', report.id);
        deleted++;
      }
      return deleted;
    });
  }

  // ---------------------------------------------------------------------------
  // Account reports
  // ---------------------------------------------------------------------------

  async addAccountReport(report: IdbAccountReport, activeAccountGuid: string): Promise<IdbAccountReport> {
    this.assertOwnership(report.accountId, activeAccountGuid, 'account report');
    return firstValueFrom(this.accountReportDb.addWithObservable({ ...report }));
  }

  async updateAccountReport(report: IdbAccountReport, activeAccountGuid: string): Promise<IdbAccountReport> {
    this.assertOwnership(report.accountId, activeAccountGuid, 'account report');
    return firstValueFrom(this.accountReportDb.updateWithObservable({ ...report }));
  }

  /** Read the latest records and commit a report edit and its optional hidden pair together. */
  async updateAccountReportSetup(reportGuid: string, changes: AccountReportSetupChanges, accountGuid: string): Promise<AccountReportSetupResult> {
    return this.transactions.runTransaction(['accounts', 'facilities', 'accountReports', 'accountAnalysisItems', 'analysisItems'], 'readwrite', async transaction => {
      const account = (await transaction.getAll<IdbAccount>('accounts')).find(item => item.guid === accountGuid);
      const reports = await transaction.getAllByIndex<IdbAccountReport>('accountReports', 'accountId', accountGuid);
      const report = reports.find(item => item.guid === reportGuid);
      if (!account || account.id === undefined || !report || report.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'The report or its account is no longer available.');
      }
      if (!account.displayEmissions && ['betterClimate', 'accountEmissionFactors'].includes(report.reportType)) {
        throw new WorkspaceWriteError('validation-failed', 'Enable Other Impacts in Account Goals to access this report type.');
      }
      if (changes.name !== undefined && !changes.name.trim()) throw new WorkspaceWriteError('validation-failed', 'Enter a nonblank report name.');
      let updated = { ...report, ...(changes.name !== undefined ? { name: changes.name.trim() } : {}) };
      if (changes.reportYear !== undefined || changes.betterPlants !== undefined) {
        if (report.reportType !== 'betterPlants') throw new WorkspaceWriteError('validation-failed', 'These settings belong to a Better Plants report.');
        if (changes.reportYear !== undefined) {
          if (changes.reportYear !== null && (!Number.isInteger(changes.reportYear) || changes.reportYear < 1800 || changes.reportYear > 9999)) {
            throw new WorkspaceWriteError('validation-failed', 'Enter a valid report year.');
          }
          updated = { ...updated, reportYear: changes.reportYear ?? undefined };
        }
        if (changes.betterPlants) {
          const options = { ...report.betterPlantsReportSetup };
          for (const [key, value] of Object.entries(changes.betterPlants)) {
            const booleans = ['includeFacilityNames', 'includeAllYears', 'includePerformanceTable'];
            const metrics = ['baselineYearWaterPilotGoal', 'reportYearWaterPilotGoal'];
            const notes = ['baselineAdjustmentNotes', 'modificationNotes', 'methodologyNotes'];
            const valid = booleans.includes(key) ? typeof value === 'boolean'
              : metrics.includes(key) ? value === null || (typeof value === 'number' && Number.isFinite(value))
              : notes.includes(key) ? value === null || typeof value === 'string' : false;
            if (!valid) throw new WorkspaceWriteError('validation-failed', 'A Better Plants setting is invalid.');
            options[key] = value ?? undefined;
          }
          updated = { ...updated, betterPlantsReportSetup: options };
        }
      }
      const selectedAnalyses: IdbAccountAnalysisItem[] = [];
      if (changes.analysis !== undefined) {
        const key = accountReportAnalysisSetupKey(report.reportType);
        if (!key) throw new WorkspaceWriteError('validation-failed', 'This report does not use an analysis selection.');
        let selected: IdbAccountAnalysisItem | undefined;
        if (changes.analysis) {
          const choice = changes.analysis;
          const accountAnalyses = await transaction.getAllByIndex<IdbAccountAnalysisItem>('accountAnalysisItems', 'accountId', accountGuid);
          const facilities = await transaction.getAllByIndex<IdbFacility>('facilities', 'accountId', accountGuid);
          const singleFacility = account.isSingleFacilityCompany === true && facilities.length === 1;
          if (choice.scope === 'account') {
            if (singleFacility) throw new WorkspaceWriteError('validation-failed', 'Choose a facility analysis for this single-facility account.');
            selected = accountAnalyses.find(item => item.guid === choice.analysisGuid);
          } else {
            const facility = facilities.find(item => item.guid === choice.facilityGuid);
            const analysis = (await transaction.getAllByIndex<IdbAnalysisItem>('analysisItems', 'accountId', accountGuid))
              .find(item => item.guid === choice.analysisGuid && item.facilityId === choice.facilityGuid);
            if (!singleFacility || !facility || !analysis || !accountReportAnalysisIsEligible(analysis)) {
              throw new WorkspaceWriteError('validation-failed', 'The selected facility analysis is no longer available for this report.');
            }
            const candidates = singleFacilityAnalysisPairCandidates(accountAnalyses, facility.guid, analysis.guid);
            const currentGuid = accountReportAnalysisGuid(report);
            const activeGuid = analysis.analysisCategory === 'water' ? account.selectedWaterAnalysisId : account.selectedEnergyAnalysisId;
            const existing = candidates.find(item => item.guid === currentGuid) ?? candidates.find(item => item.guid === activeGuid) ?? candidates[0];
            selected = existing;
            if (!existing || !singleFacilityAnalysisPairIsCurrent(existing, facility, analysis)) {
              selected = buildSingleFacilityAnalysisPair(account, facility, analysis, existing);
              if (existing?.id !== undefined) await transaction.put('accountAnalysisItems', selected);
              else selected.id = Number(await transaction.add('accountAnalysisItems', selected));
            }
          }
          if (!selected || !accountReportAnalysisIsEligible(selected)) throw new WorkspaceWriteError('validation-failed', 'Choose an available source-energy or water analysis.');
          // A reused record may be newer than this window's workspace snapshot.
          selectedAnalyses.push(selected);
        }
        updated = { ...updated, [key]: { ...updated[key], analysisItemId: selected?.guid },
          ...(selected && report.reportType !== 'accountSavings' ? { baselineYear: selected.baselineYear } : {}) };
      }
      if (JSON.stringify(updated) !== JSON.stringify(report)) {
        updated = { ...updated, modifiedDate: new Date() };
        await transaction.put('accountReports', updated);
      }
      return { report: updated, accountAnalyses: selectedAnalyses };
    });
  }

  async deleteAccountReport(report: IdbAccountReport, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(report.accountId, activeAccountGuid, 'account report');
    await firstValueFrom(this.accountReportDb.deleteWithObservable(report.id));
    return report.id;
  }

  async bulkDeleteAccountReports(reports: readonly IdbAccountReport[], activeAccountGuid: string): Promise<number> {
    reports.forEach(report => this.assertOwnership(report.accountId, activeAccountGuid, 'account report'));
    return this.transactions.runTransaction(['accountReports'], 'readwrite', async transaction => {
      let deleted = 0;
      for (const report of reports) {
        if (report.id === undefined) {
          throw new WorkspaceWriteError('validation-failed', 'Account report is missing its IndexedDB id.');
        }
        await transaction.deleteByKey('accountReports', report.id);
        deleted++;
      }
      return deleted;
    });
  }

  // ---------------------------------------------------------------------------
  // Report cascade operations
  // ---------------------------------------------------------------------------

  /**
   * Strips the given group from all account reports that reference it
   * (betterClimate and dataOverview report types).
   */
  async updateReportsRemoveGroup(groupId: string): Promise<void> {
    for (const report of this.accountWorkspaceStore.accountReports()) {
      let changed = false;
      let updated: IdbAccountReport = { ...report };
      if (report.reportType === 'betterClimate' && report.betterClimateReportSetup?.includedFacilityGroups) {
        const updatedGroups = report.betterClimateReportSetup.includedFacilityGroups.map(fg => {
          const filtered = fg.groups.filter(g => g.groupId !== groupId);
          if (filtered.length !== fg.groups.length) { changed = true; }
          return { ...fg, groups: filtered };
        });
        updated = {
          ...updated,
          betterClimateReportSetup: { ...report.betterClimateReportSetup, includedFacilityGroups: updatedGroups }
        };
      }
      if (report.reportType === 'dataOverview' && report.dataOverviewReportSetup?.includedFacilities) {
        const updatedFacilities = report.dataOverviewReportSetup.includedFacilities.map(fg => {
          const filtered = fg.includedGroups.filter(g => g.groupId !== groupId);
          if (filtered.length !== fg.includedGroups.length) { changed = true; }
          return { ...fg, includedGroups: filtered };
        });
        updated = {
          ...updated,
          dataOverviewReportSetup: { ...report.dataOverviewReportSetup, includedFacilities: updatedFacilities }
        };
      }
      if (changed) {
        await firstValueFrom(this.accountReportDb.updateWithObservable(updated));
      }
    }
  }

  /**
   * Strips the given facility from all account reports that reference it
   * (dataOverview and betterClimate included-facility lists).
   */
  async updateReportsRemoveFacility(facilityId: string): Promise<void> {
    for (const report of this.accountWorkspaceStore.accountReports()) {
      const doFacilities = report.dataOverviewReportSetup?.includedFacilities ?? [];
      const filteredDo = doFacilities.filter(f => f.facilityId !== facilityId);
      const bcGroups = report.betterClimateReportSetup?.includedFacilityGroups ?? [];
      const filteredBc = bcGroups.filter(f => f.facilityId !== facilityId);
      const doChanged = filteredDo.length !== doFacilities.length;
      const bcChanged = filteredBc.length !== bcGroups.length;
      if (!doChanged && !bcChanged) { continue; }
      const updated: IdbAccountReport = {
        ...report,
        dataOverviewReportSetup: { ...report.dataOverviewReportSetup, includedFacilities: filteredDo },
        betterClimateReportSetup: report.betterClimateReportSetup
          ? { ...report.betterClimateReportSetup, includedFacilityGroups: filteredBc }
          : report.betterClimateReportSetup
      };
      await firstValueFrom(this.accountReportDb.updateWithObservable(updated));
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertOwnership(entityAccountGuid: string | undefined, activeAccountGuid: string, label: string): void {
    if (entityAccountGuid && entityAccountGuid !== activeAccountGuid) {
      throw new WorkspaceWriteError(
        'cross-account-entity',
        `${label} belongs to account ${entityAccountGuid}, not the active account ${activeAccountGuid}.`
      );
    }
  }
}

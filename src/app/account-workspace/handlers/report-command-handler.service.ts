/**
 * Handler for facility-report, account-report, and report group/facility cascade commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountReportDbService } from '../../indexedDB/account-report-db.service';
import { FacilityReportsDbService } from '../../indexedDB/facility-reports-db.service';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { IdbAccountReport } from '../../models/idbModels/accountReport';
import { IdbFacilityReport } from '../../models/idbModels/facilityReport';
import { IndexedDbTransactionService } from '../../indexedDB/indexed-db-transaction.service';
import { WorkspaceWriteError } from '../workspace-commands.models';

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

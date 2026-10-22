import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { getNewIdbAccountReport, IdbAccountReport } from '@data/models/idbModels/accountReport';
import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { ReportType } from '@data/models/constantsAndTypes';
import { ACCOUNT_REPORT_TYPES } from '@app/v1/shared/reports/report-inventory.models';
import { reportTypeAvailable } from '@app/v1/shared/reports/report-availability';
import { AccountReportSetupChanges } from '@data/account-workspace/account-report-setup.models';

@Injectable({ providedIn: 'root' })
export class AccountReportActionsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly handler = inject(ReportCommandHandler);

  async create(name: string, type: ReportType): Promise<IdbAccountReport> {
    const accountGuid = this.requireContext();
    const trimmed = this.requireName(name);
    if (!ACCOUNT_REPORT_TYPES.some(option => option.value === type)) throw new WorkspaceWriteError('validation-failed', 'Select an existing account report type.');
    return this.add('Report created', () => {
      this.requireContext(accountGuid);
      this.requireAvailable(type);
      const account = this.workspace.account()!;
      const facilities = this.workspace.facilities().filter(item => item.accountId === accountGuid);
      const facilityGuids = new Set(facilities.map(item => item.guid));
      const groups = this.workspace.meterGroups().filter(item => item.accountId === accountGuid && facilityGuids.has(item.facilityId));
      const report = getNewIdbAccountReport(account, [...facilities], [...groups]);
      return this.handler.addAccountReport({ ...report, name: trimmed, reportType: type }, accountGuid);
    });
  }
  async copy(reportGuid: string): Promise<IdbAccountReport> {
    const accountGuid = this.requireContext();
    return this.add('Report copied', () => {
      const report = structuredClone(this.requireReport(reportGuid, accountGuid));
      delete report.id;
      return this.handler.addAccountReport({ ...report, ...getNewIdbEntry(), name: `${report.name} (Copy)`, checked: false }, accountGuid);
    });
  }
  async updateName(reportGuid: string, name: string): Promise<IdbAccountReport> {
    const accountGuid = this.requireContext();
    const trimmed = this.requireName(name);
    const report = this.requireReport(reportGuid, accountGuid);
    if (report.name === trimmed) return report;
    const result = await this.boundary.execute({
      entityKind: 'accountReport', changeKind: 'update', entityGuid: reportGuid, label: 'Saving report name',
      notification: { successTitle: 'Report renamed' },
      publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountReports', upsert: [value] }] }) }
    }, async () => {
      const latest = this.requireReport(reportGuid, accountGuid);
      return latest.name === trimmed ? latest : this.handler.updateAccountReport({ ...latest, name: trimmed }, accountGuid);
    });
    return result.value;
  }
  async updateSetup(reportGuid: string, changes: AccountReportSetupChanges): Promise<IdbAccountReport> {
    const accountGuid = this.requireContext();
    this.requireReport(reportGuid, accountGuid);
    if (changes.name !== undefined) this.requireName(changes.name);
    const result = await this.boundary.execute({
      entityKind: 'accountReport', changeKind: 'update', entityGuid: reportGuid, label: 'Saving report setup',
      notification: { suppressSuccessToast: true },
      publication: { mode: 'patch', buildPatch: value => ({ collections: [
        { collection: 'accountReports', upsert: [value.report] },
        ...(value.accountAnalyses.length ? [{ collection: 'accountAnalyses' as const, upsert: value.accountAnalyses }] : [])
      ] }) }
    }, () => {
      this.requireReport(reportGuid, accountGuid);
      return this.handler.updateAccountReportSetup(reportGuid, changes, accountGuid);
    });
    return result.value.report;
  }
  async delete(reportGuid: string): Promise<void> {
    const accountGuid = this.requireContext();
    await this.boundary.execute({
      entityKind: 'accountReport', changeKind: 'delete', entityGuid: reportGuid, label: 'Deleting report',
      notification: { successTitle: 'Report deleted' },
      publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountReports', deleteIds: [value] }] }) }
    }, () => {
      const report = this.requireReport(reportGuid, accountGuid);
      if (report.id === undefined) throw new WorkspaceWriteError('validation-failed', 'This report has no stored record ID.');
      return this.handler.deleteAccountReport(report, accountGuid);
    });
  }
  private async add(title: string, persist: () => Promise<IdbAccountReport>): Promise<IdbAccountReport> {
    const result = await this.boundary.execute({
      entityKind: 'accountReport', changeKind: 'add', label: title, notification: { successTitle: title },
      publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountReports', upsert: [value] }] }) }
    }, persist);
    return result.value;
  }
  private requireContext(expectedAccount?: string): string {
    const account = this.workspace.account();
    if (!account || !this.workspace.canWrite() || (expectedAccount && expectedAccount !== account.guid)) {
      throw new WorkspaceWriteError('workspace-not-ready', 'The report workspace changed. Reopen the reports dashboard and try again.');
    }
    return account.guid;
  }
  private requireReport(reportGuid: string, accountGuid: string): IdbAccountReport {
    this.requireContext(accountGuid);
    const report = this.workspace.accountReports().find(item => item.guid === reportGuid && item.accountId === accountGuid);
    if (!report) throw new WorkspaceWriteError('validation-failed', 'This report is no longer available in this account.');
    this.requireAvailable(report.reportType);
    return report;
  }
  private requireAvailable(type: ReportType): void {
    if (!reportTypeAvailable(type, this.workspace.account()?.displayEmissions)) throw new WorkspaceWriteError('validation-failed', 'Enable Other Impacts in Account Goals to access this report type.');
  }
  private requireName(name: string): string {
    if (!name.trim()) throw new WorkspaceWriteError('validation-failed', 'Enter a report name.');
    return name.trim();
  }
}

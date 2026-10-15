import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { FacilityReportType, getNewIdbFacilityReport, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { FACILITY_REPORT_TYPES } from './facility-report.models';
import { reportTypeAvailable } from '@app/v1/shared/reports/report-availability';

@Injectable({ providedIn: 'root' })
export class FacilityReportActionsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly handler = inject(ReportCommandHandler);

  async create(facilityGuid: string, name: string, type: FacilityReportType): Promise<IdbFacilityReport> {
    const accountGuid = this.requireContext(facilityGuid);
    const trimmed = this.requireName(name);
    if (!FACILITY_REPORT_TYPES.some(option => option.value === type)) {
      throw new WorkspaceWriteError('validation-failed', 'Select an existing facility report type.');
    }
    return this.add('Report created', async () => {
      this.requireContext(facilityGuid, accountGuid);
      this.requireAvailable(type);
      const groups = this.workspace.meterGroups().filter(group => group.facilityId === facilityGuid);
      const report = getNewIdbFacilityReport(facilityGuid, accountGuid, type, groups);
      return this.handler.addFacilityReport({ ...report, name: trimmed }, accountGuid);
    });
  }

  async copy(facilityGuid: string, reportGuid: string): Promise<IdbFacilityReport> {
    const accountGuid = this.requireContext(facilityGuid);
    return this.add('Report copied', async () => {
      const report = structuredClone(this.requireReport(facilityGuid, reportGuid, accountGuid));
      delete report.id;
      return this.handler.addFacilityReport({ ...report, ...getNewIdbEntry(), name: `${report.name} (Copy)`, checked: false }, accountGuid);
    });
  }

  async delete(facilityGuid: string, reportGuid: string): Promise<void> {
    const accountGuid = this.requireContext(facilityGuid);
    await this.boundary.execute({
      entityKind: 'facilityReport', changeKind: 'delete', entityGuid: reportGuid, label: 'Deleting report',
      notification: { successTitle: 'Report deleted' },
      publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityReports', deleteIds: [value] }] }) }
    }, () => {
      const report = this.requireReport(facilityGuid, reportGuid, accountGuid);
      if (report.id === undefined) throw new WorkspaceWriteError('validation-failed', 'This report has no stored record ID.');
      return this.handler.deleteFacilityReport(report, accountGuid);
    });
  }

  private async add(title: string, persist: () => Promise<IdbFacilityReport>): Promise<IdbFacilityReport> {
    const result = await this.boundary.execute({
      entityKind: 'facilityReport', changeKind: 'add', label: title,
      notification: { successTitle: title },
      publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityReports', upsert: [value] }] }) }
    }, persist);
    return result.value;
  }

  private requireContext(facilityGuid: string, expectedAccount?: string): string {
    const account = this.workspace.account();
    const facility = this.workspace.selectedFacility();
    // The command boundary sets hasPending while executing this operation.
    if (!this.workspace.canWrite() || !account || (expectedAccount && account.guid !== expectedAccount)
      || facility?.guid !== facilityGuid || facility.accountId !== account.guid) {
      throw new WorkspaceWriteError('workspace-not-ready', 'The report workspace changed. Reopen the facility and try again.');
    }
    return account.guid;
  }

  private requireReport(facilityGuid: string, reportGuid: string, accountGuid: string): IdbFacilityReport {
    this.requireContext(facilityGuid, accountGuid);
    const report = this.workspace.facilityReports().find(item => item.guid === reportGuid
      && item.accountId === accountGuid && item.facilityId === facilityGuid);
    if (!report) throw new WorkspaceWriteError('validation-failed', 'This report is no longer available in this facility.');
    this.requireAvailable(report.facilityReportType);
    return report;
  }

  private requireAvailable(type: FacilityReportType): void {
    if (!reportTypeAvailable(type, this.workspace.account()?.displayEmissions)) {
      throw new WorkspaceWriteError('validation-failed', 'Enable Other Impacts in Account Goals to access this report type.');
    }
  }

  private requireName(name: string): string {
    if (!name.trim()) throw new WorkspaceWriteError('validation-failed', 'Enter a report name.');
    return name.trim();
  }
}

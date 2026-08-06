/**
 * Persistence-only handler for facility-report and account-report commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountReportDbService } from '../../indexedDB/account-report-db.service';
import { FacilityReportsDbService } from '../../indexedDB/facility-reports-db.service';
import { IdbAccountReport } from '../../models/idbModels/accountReport';
import { IdbFacilityReport } from '../../models/idbModels/facilityReport';
import { WorkspaceWriteError } from '../workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class ReportCommandHandler {
  constructor(
    private readonly facilityReportDb: FacilityReportsDbService,
    private readonly accountReportDb: AccountReportDbService
  ) { }

  // ---------------------------------------------------------------------------
  // Facility reports
  // ---------------------------------------------------------------------------

  async addFacilityReport(report: IdbFacilityReport): Promise<IdbFacilityReport> {
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

  // ---------------------------------------------------------------------------
  // Account reports
  // ---------------------------------------------------------------------------

  async addAccountReport(report: IdbAccountReport): Promise<IdbAccountReport> {
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

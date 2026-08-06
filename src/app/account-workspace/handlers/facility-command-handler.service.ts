/**
 * Persistence-only handler for facility-level commands.
 *
 * Called by WorkspaceCommandBoundary inside the persist function.
 * Performs only IndexedDB writes; workspace state and events are
 * managed by the boundary.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountAnalysisDbService } from '../../indexedDB/account-analysis-db.service';
import { AccountReportDbService } from '../../indexedDB/account-report-db.service';
import { FacilitydbService } from '../../indexedDB/facility-db.service';
import { IndexedDbCascadeDeleteService } from '../../indexedDB/indexed-db-cascade-delete.service';
import { IdbAccountAnalysisItem } from '../../models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '../../models/idbModels/accountReport';
import { IdbFacility } from '../../models/idbModels/facility';
import { WorkspaceWriteError } from '../workspace-commands.models';

export interface AddFacilityResult {
  readonly facility: IdbFacility;
}

export interface DeleteFacilityResult {
  readonly facilityId: number;
}

@Injectable({ providedIn: 'root' })
export class FacilityCommandHandler {
  constructor(
    private readonly facilityDb: FacilitydbService,
    private readonly accountAnalysisDb: AccountAnalysisDbService,
    private readonly accountReportDb: AccountReportDbService,
    private readonly cascadeDelete: IndexedDbCascadeDeleteService
  ) { }

  async add(
    facility: IdbFacility,
    accountAnalyses: readonly IdbAccountAnalysisItem[],
    accountReports: readonly IdbAccountReport[]
  ): Promise<AddFacilityResult> {
    this.assertOwnership(facility.accountId, facility.accountId);

    const added = await firstValueFrom(this.facilityDb.addWithObservable({ ...facility }));

    // Patch account-level analyses and reports to include the new facility.
    for (const analysis of accountAnalyses) {
      const updated: IdbAccountAnalysisItem = {
        ...analysis,
        facilityAnalysisItems: [
          ...(analysis.facilityAnalysisItems ?? []),
          { facilityId: added.guid, analysisItemId: undefined }
        ]
      };
      await firstValueFrom(this.accountAnalysisDb.updateWithObservable(updated));
    }

    for (const report of accountReports) {
      const updatedReport: IdbAccountReport = { ...report };
      if (updatedReport.dataOverviewReportSetup) {
        updatedReport.dataOverviewReportSetup = {
          ...updatedReport.dataOverviewReportSetup,
          includedFacilities: [
            ...updatedReport.dataOverviewReportSetup.includedFacilities,
            { facilityId: added.guid, included: false, includedGroups: [] }
          ]
        };
      }
      if (updatedReport.betterClimateReportSetup) {
        updatedReport.betterClimateReportSetup = {
          ...updatedReport.betterClimateReportSetup,
          includedFacilityGroups: [
            ...updatedReport.betterClimateReportSetup.includedFacilityGroups,
            { facilityId: added.guid, include: false, groups: [] }
          ]
        };
      }
      await firstValueFrom(this.accountReportDb.updateWithObservable(updatedReport));
    }

    return { facility: added };
  }

  async update(facility: IdbFacility, activeAccountGuid: string): Promise<IdbFacility> {
    this.assertOwnership(facility.accountId, activeAccountGuid);
    return firstValueFrom(this.facilityDb.updateWithObservable({ ...facility }));
  }

  async delete(
    facility: IdbFacility,
    activeAccountGuid: string,
    onProgress?: (phase: { index: number }) => void
  ): Promise<DeleteFacilityResult> {
    this.assertOwnership(facility.accountId, activeAccountGuid);
    await this.cascadeDelete.deleteFacility(facility, activeAccountGuid, phase => {
      onProgress?.({ index: phase.index - 1 });
    });
    return { facilityId: facility.id };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertOwnership(entityAccountGuid: string | undefined, activeAccountGuid: string): void {
    if (entityAccountGuid && entityAccountGuid !== activeAccountGuid) {
      throw new WorkspaceWriteError(
        'cross-account-entity',
        `Facility belongs to account ${entityAccountGuid}, not the active account ${activeAccountGuid}.`
      );
    }
  }
}

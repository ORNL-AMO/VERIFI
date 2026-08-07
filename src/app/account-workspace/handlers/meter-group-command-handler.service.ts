/**
 * Handler for meter-group commands that coordinate changes across
 * MeterGroup → Analysis → AccountReport entity lines.
 */
import { Injectable } from '@angular/core';
import { AnalysisDbService } from '../../indexedDB/analysis-db.service';
import { AccountReportDbService } from '../../indexedDB/account-report-db.service';
import { IdbUtilityMeterGroup } from '../../models/idbModels/utilityMeterGroup';

@Injectable({ providedIn: 'root' })
export class MeterGroupCommandHandler {
  constructor(
    private readonly analysisDb: AnalysisDbService,
    private readonly accountReportDb: AccountReportDbService
  ) { }

  /**
   * Adds the new group to facility-analysis items of the matching category
   * and to all account-report inclusion lists.
   */
  async addGroup(group: IdbUtilityMeterGroup): Promise<void> {
    await this.analysisDb.addGroup(group.guid, group.groupType);
    await this.accountReportDb.addGroup(group);
  }

  /**
   * Removes the group from all facility-analysis items and strips it from
   * all account-report inclusion lists.
   */
  async deleteGroup(groupId: string): Promise<void> {
    await this.analysisDb.deleteGroup(groupId);
    await this.accountReportDb.updateReportsRemoveGroup(groupId);
  }

  /**
   * Updates analysis items when a group changes type: adds the group to
   * analyses of the new type and removes it from analyses of the old type.
   * No report-side update is needed for a type change alone.
   */
  async changeGroupType(
    groupId: string,
    newGroupType: 'Energy' | 'Water' | 'Other',
    oldGroupType: 'Energy' | 'Water' | 'Other'
  ): Promise<void> {
    await this.analysisDb.changeGroupType(groupId, newGroupType, oldGroupType);
  }
}

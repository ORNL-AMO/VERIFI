/**
 * Handler for meter-group commands that coordinate changes across
 * MeterGroup → Analysis → AccountReport entity lines, and for
 * meter-reassignment operations within a group.
 *
 * All state reads use AccountWorkspaceStore signals filtered by the group's
 * facilityId rather than the currently selected facility, so queued commands
 * always target the correct records regardless of navigation.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AnalysisDbService } from '../../indexedDB/analysis-db.service';
import { AccountReportDbService } from '../../indexedDB/account-report-db.service';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { MeterCommandHandler } from './meter-command-handler.service';
import { getNewAnalysisGroup } from '../../models/idbModels/analysisItem';
import { IdbUtilityMeter } from '../../models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '../../models/idbModels/utilityMeterGroup';
import { AnalysisGroupPredictorVariable } from '../../models/analysis';

@Injectable({ providedIn: 'root' })
export class MeterGroupCommandHandler {
  constructor(
    private readonly analysisDb: AnalysisDbService,
    private readonly accountReportDb: AccountReportDbService,
    private readonly accountWorkspaceStore: AccountWorkspaceStore,
    private readonly meterHandler: MeterCommandHandler
  ) { }

  /**
   * Adds the new group to facility-analysis items of the matching category
   * and to all account-report inclusion lists.
   */
  async addGroup(group: IdbUtilityMeterGroup): Promise<void> {
    const predictorVariables = this.buildPredictorVariables(group.facilityId);
    const facilityAnalysisItems = this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === group.facilityId);
    for (const item of facilityAnalysisItems) {
      if (
        (item.analysisCategory === 'energy' && group.groupType === 'Energy') ||
        (item.analysisCategory === 'water' && group.groupType === 'Water')
      ) {
        const updated = { ...item, groups: [...item.groups, getNewAnalysisGroup(group.guid, predictorVariables)] };
        await firstValueFrom(this.analysisDb.updateWithObservable(updated));
      }
    }
    for (const report of this.accountWorkspaceStore.accountReports()) {
      let changed = false;
      if (report.reportType === 'betterClimate') {
        report.betterClimateReportSetup.includedFacilityGroups.forEach(fg => {
          if (fg.facilityId === group.facilityId) {
            fg.groups.push({ groupId: group.guid, include: true });
            changed = true;
          }
        });
      }
      if (report.reportType === 'dataOverview') {
        report.dataOverviewReportSetup.includedFacilities.forEach(fg => {
          if (fg.facilityId === group.facilityId) {
            fg.includedGroups.push({ groupId: group.guid, include: true });
            changed = true;
          }
        });
      }
      if (changed) {
        await firstValueFrom(this.accountReportDb.updateWithObservable(report));
      }
    }
  }

  /**
   * Removes the group from all facility-analysis items and strips it from
   * all account-report inclusion lists.
   */
  async deleteGroup(group: IdbUtilityMeterGroup): Promise<void> {
    const facilityAnalysisItems = this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === group.facilityId);
    for (const item of facilityAnalysisItems) {
      const updated = { ...item, groups: item.groups.filter(g => g.idbGroupId !== group.guid) };
      await firstValueFrom(this.analysisDb.updateWithObservable(updated));
    }
    for (const report of this.accountWorkspaceStore.accountReports()) {
      let changed = false;
      if (report.reportType === 'betterClimate' && report.betterClimateReportSetup.includedFacilityGroups) {
        report.betterClimateReportSetup.includedFacilityGroups.forEach(fg => {
          const before = fg.groups.length;
          fg.groups = fg.groups.filter(g => g.groupId !== group.guid);
          if (fg.groups.length !== before) { changed = true; }
        });
      }
      if (report.reportType === 'dataOverview' && report.dataOverviewReportSetup.includedFacilities) {
        report.dataOverviewReportSetup.includedFacilities.forEach(fg => {
          const before = fg.includedGroups.length;
          fg.includedGroups = fg.includedGroups.filter(g => g.groupId !== group.guid);
          if (fg.includedGroups.length !== before) { changed = true; }
        });
      }
      if (changed) {
        await firstValueFrom(this.accountReportDb.updateWithObservable(report));
      }
    }
  }

  /**
   * Persists all changes for a meter-group save operation:
   * 1. Optionally updates analysis items when the group type changed.
   * 2. Writes the updated group record.
   * 3. Reassigns meters: adds them to the group or clears their groupId.
   */
  async saveMeterGroup(
    group: IdbUtilityMeterGroup,
    groupTypeChanged: boolean,
    oldGroupType: 'Energy' | 'Water' | 'Other',
    metersToAdd: readonly IdbUtilityMeter[],
    metersToRemove: readonly IdbUtilityMeter[],
    activeAccountGuid: string
  ): Promise<void> {
    if (groupTypeChanged) {
      await this.changeGroupType(group, oldGroupType);
    }
    await this.meterHandler.updateMeterGroup(group, activeAccountGuid);
    for (const meter of metersToAdd) {
      meter.groupId = group.guid;
      await this.meterHandler.updateMeter(meter, activeAccountGuid);
    }
    for (const meter of metersToRemove) {
      meter.groupId = undefined;
      await this.meterHandler.updateMeter(meter, activeAccountGuid);
    }
  }

  /**
   * Updates analysis items when a group changes type: adds the group to
   * analyses of the new type and removes it from analyses of the old type.
   * No report-side update is needed for a type change alone.
   */
  async changeGroupType(
    group: IdbUtilityMeterGroup,
    oldGroupType: 'Energy' | 'Water' | 'Other'
  ): Promise<void> {
    const newGroupType = group.groupType;
    const predictorVariables = this.buildPredictorVariables(group.facilityId);
    const facilityAnalysisItems = this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === group.facilityId);
    for (const item of facilityAnalysisItems) {
      const matchesNew =
        (item.analysisCategory === 'energy' && newGroupType === 'Energy') ||
        (item.analysisCategory === 'water' && newGroupType === 'Water');
      const matchesOld =
        (item.analysisCategory === 'energy' && oldGroupType === 'Energy') ||
        (item.analysisCategory === 'water' && oldGroupType === 'Water');
      if (matchesNew && !item.groups.some(g => g.idbGroupId === group.guid)) {
        const updated = { ...item, groups: [...item.groups, getNewAnalysisGroup(group.guid, predictorVariables)] };
        await firstValueFrom(this.analysisDb.updateWithObservable(updated));
      } else if (matchesOld && !matchesNew) {
        const updated = { ...item, groups: item.groups.filter(g => g.idbGroupId !== group.guid) };
        await firstValueFrom(this.analysisDb.updateWithObservable(updated));
      }
    }
  }

  private buildPredictorVariables(facilityId: string): AnalysisGroupPredictorVariable[] {
    return this.accountWorkspaceStore.predictors()
      .filter(p => p.facilityId === facilityId)
      .map(p => ({
        id: p.guid,
        name: p.name,
        production: p.production,
        productionInAnalysis: true,
        regressionCoefficient: undefined,
        unit: p.unit
      }));
  }
}

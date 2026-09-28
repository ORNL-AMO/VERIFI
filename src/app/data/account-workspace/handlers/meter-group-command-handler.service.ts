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
import { AnalysisDbService } from '@data/indexedDB/analysis-db.service';
import { AccountReportDbService } from '@data/indexedDB/account-report-db.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { MeterCommandHandler } from './meter-command-handler.service';
import { getNewAnalysisGroup } from '@data/models/idbModels/analysisItem';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { AnalysisGroupPredictorVariable } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { WorkspaceWriteError } from '../workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class MeterGroupCommandHandler {
  constructor(
    private readonly analysisDb: AnalysisDbService,
    private readonly accountReportDb: AccountReportDbService,
    private readonly accountWorkspaceStore: AccountWorkspaceStore,
    private readonly meterHandler: MeterCommandHandler,
    private readonly transactions: IndexedDbTransactionService
  ) { }

  async createMeterGroup(
    group: IdbUtilityMeterGroup,
    activeAccountGuid: string
  ): Promise<IdbUtilityMeterGroup> {
    this.assertGroup(group, activeAccountGuid, false);
    const analyses = this.buildAddedGroupAnalyses(group);
    const reports = this.buildGroupReports(group, 'add');
    this.assertRelatedRecords(analyses, reports, [], activeAccountGuid);
    let groupId: IDBValidKey | undefined;
    await this.transactions.runTransaction(
      ['utilityMeterGroups', 'analysisItems', 'accountReports'],
      'readwrite',
      async transaction => {
        groupId = await transaction.add('utilityMeterGroups', { ...group });
        for (const analysis of analyses) await transaction.put('analysisItems', analysis);
        for (const report of reports) await transaction.put('accountReports', report);
      }
    );
    return { ...group, id: Number(groupId) };
  }

  async updateMeterGroupAtomic(
    group: IdbUtilityMeterGroup,
    groupTypeChanged: boolean,
    oldGroupType: 'Energy' | 'Water' | 'Other',
    metersToAdd: readonly IdbUtilityMeter[],
    metersToRemove: readonly IdbUtilityMeter[],
    activeAccountGuid: string
  ): Promise<void> {
    this.assertGroup(group, activeAccountGuid, true);
    const analyses = groupTypeChanged ? this.buildTypeChangedAnalyses(group, oldGroupType) : [];
    const updatedMeters = [
      ...metersToAdd.map(meter => ({ ...structuredClone(meter), groupId: group.guid })),
      ...metersToRemove.map(meter => ({ ...structuredClone(meter), groupId: undefined }))
    ];
    this.assertRelatedRecords(analyses, [], updatedMeters, activeAccountGuid);
    await this.transactions.runTransaction(
      ['utilityMeterGroups', 'utilityMeter', 'analysisItems'],
      'readwrite',
      async transaction => {
        await transaction.put('utilityMeterGroups', { ...group });
        for (const meter of updatedMeters) await transaction.put('utilityMeter', meter);
        for (const analysis of analyses) await transaction.put('analysisItems', analysis);
      }
    );
  }

  async deleteMeterGroupAtomic(
    group: IdbUtilityMeterGroup,
    metersToClear: readonly IdbUtilityMeter[],
    activeAccountGuid: string
  ): Promise<void> {
    this.assertGroup(group, activeAccountGuid, true);
    const analyses = this.buildDeletedGroupAnalyses(group);
    const reports = this.buildGroupReports(group, 'delete');
    const updatedMeters = metersToClear.map(meter => ({ ...structuredClone(meter), groupId: undefined }));
    this.assertRelatedRecords(analyses, reports, updatedMeters, activeAccountGuid);
    await this.transactions.runTransaction(
      ['utilityMeterGroups', 'utilityMeter', 'analysisItems', 'accountReports'],
      'readwrite',
      async transaction => {
        await transaction.deleteByKey('utilityMeterGroups', group.id!);
        for (const meter of updatedMeters) await transaction.put('utilityMeter', meter);
        for (const analysis of analyses) await transaction.put('analysisItems', analysis);
        for (const report of reports) await transaction.put('accountReports', report);
      }
    );
  }

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

  private buildAddedGroupAnalyses(group: IdbUtilityMeterGroup): IdbAnalysisItem[] {
    const predictorVariables = this.buildPredictorVariables(group.facilityId);
    return this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === group.facilityId)
      .filter(item => (item.analysisCategory === 'energy' && group.groupType === 'Energy')
        || (item.analysisCategory === 'water' && group.groupType === 'Water'))
      .filter(item => !item.groups.some(existing => existing.idbGroupId === group.guid))
      .map(item => ({
        ...structuredClone(item),
        groups: [...item.groups, getNewAnalysisGroup(group.guid, predictorVariables)]
      }));
  }

  private buildDeletedGroupAnalyses(group: IdbUtilityMeterGroup): IdbAnalysisItem[] {
    return this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === group.facilityId
        && item.groups.some(existing => existing.idbGroupId === group.guid))
      .map(item => ({
        ...structuredClone(item),
        groups: item.groups.filter(existing => existing.idbGroupId !== group.guid)
      }));
  }

  private buildTypeChangedAnalyses(
    group: IdbUtilityMeterGroup,
    oldGroupType: 'Energy' | 'Water' | 'Other'
  ): IdbAnalysisItem[] {
    const predictorVariables = this.buildPredictorVariables(group.facilityId);
    return this.accountWorkspaceStore.facilityAnalyses()
      .filter(item => item.facilityId === group.facilityId)
      .flatMap(item => {
        const matchesNew = (item.analysisCategory === 'energy' && group.groupType === 'Energy')
          || (item.analysisCategory === 'water' && group.groupType === 'Water');
        const matchesOld = (item.analysisCategory === 'energy' && oldGroupType === 'Energy')
          || (item.analysisCategory === 'water' && oldGroupType === 'Water');
        if (matchesNew && !item.groups.some(existing => existing.idbGroupId === group.guid)) {
          return [{ ...structuredClone(item), groups: [...item.groups, getNewAnalysisGroup(group.guid, predictorVariables)] }];
        }
        if (matchesOld && !matchesNew) {
          return [{ ...structuredClone(item), groups: item.groups.filter(existing => existing.idbGroupId !== group.guid) }];
        }
        return [];
      });
  }

  private buildGroupReports(
    group: IdbUtilityMeterGroup,
    operation: 'add' | 'delete'
  ): IdbAccountReport[] {
    return this.accountWorkspaceStore.accountReports().flatMap(source => {
      const report = structuredClone(source);
      let changed = false;
      if (report.reportType === 'betterClimate' && report.betterClimateReportSetup.includedFacilityGroups) {
        report.betterClimateReportSetup.includedFacilityGroups.forEach(facility => {
          if (facility.facilityId !== group.facilityId) return;
          const includesGroup = facility.groups.some(existing => existing.groupId === group.guid);
          if (operation === 'add' && !includesGroup) {
            facility.groups.push({ groupId: group.guid, include: true });
            changed = true;
          } else if (operation === 'delete' && includesGroup) {
            facility.groups = facility.groups.filter(existing => existing.groupId !== group.guid);
            changed = true;
          }
        });
      }
      if (report.reportType === 'dataOverview' && report.dataOverviewReportSetup.includedFacilities) {
        report.dataOverviewReportSetup.includedFacilities.forEach(facility => {
          if (facility.facilityId !== group.facilityId) return;
          const includesGroup = facility.includedGroups.some(existing => existing.groupId === group.guid);
          if (operation === 'add' && !includesGroup) {
            facility.includedGroups.push({ groupId: group.guid, include: true });
            changed = true;
          } else if (operation === 'delete' && includesGroup) {
            facility.includedGroups = facility.includedGroups.filter(existing => existing.groupId !== group.guid);
            changed = true;
          }
        });
      }
      return changed ? [report] : [];
    });
  }

  private assertGroup(
    group: IdbUtilityMeterGroup,
    activeAccountGuid: string,
    requireId: boolean
  ): void {
    if (group.accountId && group.accountId !== activeAccountGuid) {
      throw new WorkspaceWriteError('cross-account-entity', 'The meter group belongs to another account.');
    }
    if (requireId && group.id === undefined) {
      throw new WorkspaceWriteError('validation-failed', 'Meter group is missing its IndexedDB id.');
    }
  }

  private assertRelatedRecords(
    analyses: readonly IdbAnalysisItem[],
    reports: readonly IdbAccountReport[],
    meters: readonly IdbUtilityMeter[],
    activeAccountGuid: string
  ): void {
    for (const record of [...analyses, ...reports, ...meters]) {
      if (record.accountId && record.accountId !== activeAccountGuid) {
        throw new WorkspaceWriteError('cross-account-entity', 'A related meter-group record belongs to another account.');
      }
      if (record.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'A related meter-group record is missing its IndexedDB id.');
      }
    }
  }
}

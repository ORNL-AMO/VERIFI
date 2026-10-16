/**
 * Persistence-only handler for meter, meter-data, and meter-group commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UtilityMeterdbService } from '@data/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '@data/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '@data/indexedDB/utilityMeterGroup-db.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { WorkspaceWriteError } from '../workspace-commands.models';

export interface MeterDeletionChanges {
  readonly meter: IdbUtilityMeter;
  readonly meterData: readonly IdbUtilityMeterData[];
}

@Injectable({ providedIn: 'root' })
export class MeterCommandHandler {
  constructor(
    private readonly meterDb: UtilityMeterdbService,
    private readonly meterDataDb: UtilityMeterDatadbService,
    private readonly meterGroupDb: UtilityMeterGroupdbService,
    private readonly transactions: IndexedDbTransactionService
  ) { }

  // ---------------------------------------------------------------------------
  // Meter
  // ---------------------------------------------------------------------------

  async addMeter(meter: IdbUtilityMeter, activeAccountGuid: string): Promise<IdbUtilityMeter> {
    this.assertOwnership(meter.accountId, activeAccountGuid, 'meter');
    return firstValueFrom(this.meterDb.addWithObservable({ ...meter }));
  }

  async updateMeter(meter: IdbUtilityMeter, activeAccountGuid: string): Promise<IdbUtilityMeter> {
    this.assertOwnership(meter.accountId, activeAccountGuid, 'meter');
    return firstValueFrom(this.meterDb.updateWithObservable({ ...meter }));
  }

  async updateMeterWithData(
    meter: IdbUtilityMeter,
    meterData: readonly IdbUtilityMeterData[],
    activeAccountGuid: string
  ): Promise<IdbUtilityMeter> {
    this.assertOwnership(meter.accountId, activeAccountGuid, 'meter');
    if (meter.id === undefined) {
      throw new WorkspaceWriteError('validation-failed', 'Meter is missing its IndexedDB id.');
    }

    for (const entry of meterData) {
      this.assertOwnership(entry.accountId, activeAccountGuid, 'meter data');
      if (entry.meterId !== meter.guid) {
        throw new WorkspaceWriteError(
          'validation-failed',
          `Meter data ${entry.guid} does not belong to meter ${meter.guid}.`
        );
      }
      if (entry.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'Meter data is missing its IndexedDB id.');
      }
    }

    return this.transactions.runTransaction(['utilityMeter', 'utilityMeterData'], 'readwrite', async transaction => {
      await transaction.put('utilityMeter', { ...meter });
      for (const entry of meterData) {
        await transaction.put('utilityMeterData', { ...entry });
      }
      return meter;
    });
  }

  async updateMeterWithFacility(
    meter: IdbUtilityMeter,
    facility: IdbFacility,
    activeAccountGuid: string
  ): Promise<IdbUtilityMeter> {
    this.assertOwnership(meter.accountId, activeAccountGuid, 'meter');
    this.assertOwnership(facility.accountId, activeAccountGuid, 'facility');
    if (meter.facilityId !== facility.guid) {
      throw new WorkspaceWriteError(
        'validation-failed',
        `Meter ${meter.guid} does not belong to facility ${facility.guid}.`
      );
    }
    if (meter.id === undefined) {
      throw new WorkspaceWriteError('validation-failed', 'Meter is missing its IndexedDB id.');
    }
    if (facility.id === undefined) {
      throw new WorkspaceWriteError('validation-failed', 'Facility is missing its IndexedDB id.');
    }

    return this.transactions.runTransaction(['utilityMeter', 'facilities'], 'readwrite', async transaction => {
      await transaction.put('utilityMeter', { ...meter });
      await transaction.put('facilities', { ...facility });
      return meter;
    });
  }

  async deleteMeter(meter: IdbUtilityMeter, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(meter.accountId, activeAccountGuid, 'meter');
    await firstValueFrom(this.meterDb.deleteIndexWithObservable(meter.id));
    return meter.id;
  }

  async deleteMeterWithData(
    changes: MeterDeletionChanges,
    activeAccountGuid: string
  ): Promise<void> {
    this.assertOwnership(changes.meter.accountId, activeAccountGuid, 'meter');
    if (changes.meter.id === undefined) {
      throw new WorkspaceWriteError('validation-failed', 'Meter is missing its IndexedDB id.');
    }
    changes.meterData.forEach(entry => {
      this.assertOwnership(entry.accountId, activeAccountGuid, 'meter data');
      if (entry.meterId !== changes.meter.guid || entry.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'Meter data is incomplete or belongs to another meter.');
      }
    });
    await this.transactions.runTransaction(['utilityMeter', 'utilityMeterData'], 'readwrite', async transaction => {
      for (const entry of changes.meterData) {
        await transaction.deleteByKey('utilityMeterData', entry.id!);
      }
      await transaction.deleteByKey('utilityMeter', changes.meter.id!);
    });
  }

  async deleteMetersWithData(changes: readonly MeterDeletionChanges[], activeAccountGuid: string): Promise<number> {
    if (!changes.length) return 0;
    const facilityGuid = changes[0].meter.facilityId;
    const meterGuids = new Set<string>();
    const meterIds = new Set<number>();
    const readingIds = new Set<number>();
    for (const { meter, meterData } of changes) {
      this.assertOwnership(meter.accountId, activeAccountGuid, 'meter');
      if (meter.accountId !== activeAccountGuid || !facilityGuid || meter.facilityId !== facilityGuid
        || meter.id === undefined || meterGuids.has(meter.guid) || meterIds.has(meter.id)) {
        throw new WorkspaceWriteError('validation-failed', 'Select distinct meters from the same facility.');
      }
      meterGuids.add(meter.guid);
      meterIds.add(meter.id);
      for (const entry of meterData) {
        this.assertOwnership(entry.accountId, activeAccountGuid, 'meter data');
        if (entry.accountId !== activeAccountGuid || entry.facilityId !== facilityGuid || entry.meterId !== meter.guid
          || entry.id === undefined || readingIds.has(entry.id)) {
          throw new WorkspaceWriteError('validation-failed', 'Meter readings are incomplete or belong to another meter.');
        }
        readingIds.add(entry.id);
      }
    }
    return this.transactions.runTransaction(['utilityMeter', 'utilityMeterData'], 'readwrite', async transaction => {
      // Recheck stored identities and the complete reading set before deleting anything.
      for (const { meter, meterData } of changes) {
        const stored = await transaction.get<IdbUtilityMeter>('utilityMeter', meter.id!);
        if (!stored || stored.guid !== meter.guid || stored.accountId !== activeAccountGuid || stored.facilityId !== facilityGuid) {
          throw new WorkspaceWriteError('validation-failed', 'The selected meters changed. Refresh and try again.');
        }
        const readings = await transaction.getAllByIndex<IdbUtilityMeterData>('utilityMeterData', 'meterId', meter.guid);
        const expected = new Map(meterData.map(entry => [entry.id, entry.guid]));
        if (readings.length !== meterData.length || readings.some(entry => entry.accountId !== activeAccountGuid
          || entry.facilityId !== facilityGuid || expected.get(entry.id) !== entry.guid)) {
          throw new WorkspaceWriteError('validation-failed', 'The selected readings changed. Refresh and try again.');
        }
      }
      for (const { meter, meterData } of changes) {
        for (const entry of meterData) await transaction.deleteByKey('utilityMeterData', entry.id!);
        await transaction.deleteByKey('utilityMeter', meter.id!);
      }
      return changes.length;
    });
  }

  // ---------------------------------------------------------------------------
  // Meter data
  // ---------------------------------------------------------------------------

  async addMeterData(meterData: IdbUtilityMeterData, activeAccountGuid: string): Promise<IdbUtilityMeterData> {
    this.assertOwnership(meterData.accountId, activeAccountGuid, 'meter data');
    return firstValueFrom(this.meterDataDb.addWithObservable({ ...meterData }));
  }

  async updateMeterData(meterData: IdbUtilityMeterData, activeAccountGuid: string): Promise<IdbUtilityMeterData> {
    this.assertOwnership(meterData.accountId, activeAccountGuid, 'meter data');
    return firstValueFrom(this.meterDataDb.updateWithObservable({ ...meterData }));
  }

  async deleteMeterData(meterDataId: number): Promise<number> {
    await firstValueFrom(this.meterDataDb.deleteWithObservable(meterDataId));
    return meterDataId;
  }

  // ---------------------------------------------------------------------------
  // Meter group
  // ---------------------------------------------------------------------------

  async addMeterGroup(group: IdbUtilityMeterGroup, activeAccountGuid: string): Promise<IdbUtilityMeterGroup> {
    this.assertOwnership(group.accountId, activeAccountGuid, 'meter group');
    return firstValueFrom(this.meterGroupDb.addWithObservable({ ...group }));
  }

  async updateMeterGroup(group: IdbUtilityMeterGroup, activeAccountGuid: string): Promise<IdbUtilityMeterGroup> {
    this.assertOwnership(group.accountId, activeAccountGuid, 'meter group');
    return firstValueFrom(this.meterGroupDb.updateWithObservable({ ...group }));
  }

  async deleteMeterGroup(groupId: number): Promise<number> {
    await firstValueFrom(this.meterGroupDb.deleteWithObservable(groupId));
    return groupId;
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

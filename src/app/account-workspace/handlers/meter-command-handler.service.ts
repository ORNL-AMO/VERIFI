/**
 * Persistence-only handler for meter, meter-data, and meter-group commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../../indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '../../indexedDB/utilityMeterGroup-db.service';
import { IndexedDbTransactionService } from '../../indexedDB/indexed-db-transaction.service';
import { IdbFacility } from '../../models/idbModels/facility';
import { IdbUtilityMeter } from '../../models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '../../models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '../../models/idbModels/utilityMeterGroup';
import { WorkspaceWriteError } from '../workspace-commands.models';

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

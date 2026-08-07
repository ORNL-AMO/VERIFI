/**
 * Persistence-only handler for meter, meter-data, and meter-group commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../../indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '../../indexedDB/utilityMeterGroup-db.service';
import { IdbUtilityMeter } from '../../models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '../../models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '../../models/idbModels/utilityMeterGroup';
import { WorkspaceWriteError } from '../workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class MeterCommandHandler {
  constructor(
    private readonly meterDb: UtilityMeterdbService,
    private readonly meterDataDb: UtilityMeterDatadbService,
    private readonly meterGroupDb: UtilityMeterGroupdbService
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

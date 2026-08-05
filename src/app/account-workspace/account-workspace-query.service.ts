import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { IdbPredictor } from '../models/idbModels/predictor';
import { IdbPredictorData } from '../models/idbModels/predictorData';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { AccountWorkspaceStore } from './account-workspace.store';

@Injectable({ providedIn: 'root' })
export class AccountWorkspaceQueryService {
  constructor(private store: AccountWorkspaceStore) { }

  getGroupMetersByGroupId(groupId: string): IdbUtilityMeter[] {
    return this.store.meters().filter(meter => meter.groupId === groupId).map(meter => ({ ...meter }));
  }

  getMeterByGuid(guid: string): IdbUtilityMeter | undefined {
    const meter = this.store.meters().find(item => item.guid === guid);
    return meter ? { ...meter } : undefined;
  }

  getAccountMetersCopy(): IdbUtilityMeter[] {
    return this.store.meters().map(meter => structuredClone(meter));
  }

  getMetersForExport(): IdbUtilityMeter[] {
    return this.getAccountMetersCopy().map(meter => ({
      ...meter,
      meterNumber: meter.meterNumber ?? `${meter.source.replace(' ', '_')}_${meter.guid}`
    }));
  }

  getFacilityMeters(facilityGuid: string): IdbUtilityMeter[] {
    return this.store.meters().filter(meter => meter.facilityId === facilityGuid).map(meter => ({ ...meter }));
  }

  getMeterData(meterGuid: string): IdbUtilityMeterData[] {
    return this.store.meterData().filter(data => data.meterId === meterGuid).map(data => ({ ...data }));
  }

  getFacilityMeterData(facilityGuid: string): IdbUtilityMeterData[] {
    return this.store.meterData().filter(data => data.facilityId === facilityGuid).map(data => ({ ...data }));
  }

  getFacilityMeterDataYears(facilityGuid: string): { startYear: number; endYear: number } {
    const years = this.getFacilityMeterData(facilityGuid).map(data => data.year);
    return { startYear: _.min(years), endYear: _.max(years) };
  }

  getMeterGroupByGuid(guid: string): IdbUtilityMeterGroup | undefined {
    const group = this.store.meterGroups().find(item => item.guid === guid);
    return group ? { ...group } : undefined;
  }

  getMeterGroupName(guid: string): string | undefined {
    return this.store.meterGroups().find(group => group.guid === guid)?.name;
  }

  getAccountMeterGroupsCopy(): IdbUtilityMeterGroup[] {
    return this.store.meterGroups().map(group => structuredClone(group));
  }

  getFacilityMeterGroups(facilityGuid: string): IdbUtilityMeterGroup[] {
    return this.store.meterGroups().filter(group => group.facilityId === facilityGuid).map(group => ({ ...group }));
  }

  getPredictorByGuid(guid: string): IdbPredictor | undefined {
    const predictor = this.store.predictors().find(item => item.guid === guid);
    return predictor ? { ...predictor } : undefined;
  }

  getFacilityPredictors(facilityGuid: string): IdbPredictor[] {
    return this.store.predictors().filter(item => item.facilityId === facilityGuid).map(item => ({ ...item }));
  }

  getFacilityPredictorsCopy(facilityGuid: string): IdbPredictor[] {
    return this.getFacilityPredictors(facilityGuid).map(item => structuredClone(item));
  }

  getPredictorDataByGuid(guid: string): IdbPredictorData | undefined {
    const data = this.store.predictorData().find(item => item.guid === guid);
    return data ? { ...data } : undefined;
  }

  getPredictorData(predictorGuid: string): IdbPredictorData[] {
    return this.store.predictorData().filter(item => item.predictorId === predictorGuid).map(item => ({ ...item }));
  }

  getFacilityPredictorData(facilityGuid: string): IdbPredictorData[] {
    return this.store.predictorData().filter(item => item.facilityId === facilityGuid).map(item => ({ ...item }));
  }
}

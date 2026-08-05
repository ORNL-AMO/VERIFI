import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { IdbAccount } from '../models/idbModels/account';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { IdbFacility } from '../models/idbModels/facility';

@Injectable({ providedIn: 'root' })
export class AnalysisSelectionRepairService {
  repairAccount(account: IdbAccount, analyses: Array<IdbAccountAnalysisItem>): { account: IdbAccount; isChanged: boolean } {
    let isChanged = false;
    const repaired = { ...account };
    if (repaired.selectedEnergyAnalysisId === undefined) {
      const selected = this.latestAnalysis(analyses.filter(item => item.analysisCategory === 'energy'));
      if (selected) { repaired.selectedEnergyAnalysisId = selected.guid; isChanged = true; }
    }
    if (repaired.selectedWaterAnalysisId === undefined) {
      const selected = this.latestAnalysis(analyses.filter(item => item.analysisCategory === 'water'));
      if (selected) { repaired.selectedWaterAnalysisId = selected.guid; isChanged = true; }
    }
    return { account: repaired, isChanged };
  }

  repairFacility(facility: IdbFacility, analyses: Array<IdbAnalysisItem>): { facility: IdbFacility; isChanged: boolean } {
    let isChanged = false;
    const repaired = { ...facility };
    if (repaired.selectedEnergyAnalysisId === undefined) {
      const selected = this.latestAnalysis(analyses.filter(item => item.facilityId === facility.guid && item.analysisCategory === 'energy'));
      if (selected) { repaired.selectedEnergyAnalysisId = selected.guid; isChanged = true; }
    }
    if (repaired.selectedWaterAnalysisId === undefined) {
      const selected = this.latestAnalysis(analyses.filter(item => item.facilityId === facility.guid && item.analysisCategory === 'water'));
      if (selected) { repaired.selectedWaterAnalysisId = selected.guid; isChanged = true; }
    }
    return { facility: repaired, isChanged };
  }

  private latestAnalysis<T extends { guid: string; reportYear?: number; selectedYearAnalysis?: boolean }>(items: Array<T>): T | undefined {
    const preferred = items.filter(item => item.selectedYearAnalysis);
    return _.maxBy(preferred.length > 0 ? preferred : items, item => item.reportYear) ?? items[0];
  }
}

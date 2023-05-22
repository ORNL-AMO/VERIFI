import { Injectable } from '@angular/core';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from '../models/idb';
import { AnalysisSetupErrors, GroupErrors } from '../models/analysis';
import { FacilitydbService } from './facility-db.service';
import { AnalysisValidationService } from '../shared/helper-services/analysis-validation.service';

@Injectable({
  providedIn: 'root'
})
export class UpdateDbEntryService {

  constructor(private analysisValidationService: AnalysisValidationService, private facilityDbService: FacilitydbService) { }

  updateAccount(account: IdbAccount): { account: IdbAccount, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!account.electricityUnit) {
      account.electricityUnit = 'kWh';
      isChanged = true;
    }

    if (account.volumeGasUnit == 'MCF') {
      account.volumeGasUnit = 'kSCF';
      isChanged = true;
    }

    return { account: account, isChanged: isChanged };
  }

  updateFacility(facility: IdbFacility): { facility: IdbFacility, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!facility.electricityUnit) {
      facility.electricityUnit = 'kWh';
      isChanged = true;
    }

    if (facility.volumeGasUnit == 'MCF') {
      facility.volumeGasUnit = 'kSCF';
      isChanged = true;
    }

    return { facility: facility, isChanged: isChanged };
  }

  updateAnalysis(analysisItem: IdbAnalysisItem): { analysisItem: IdbAnalysisItem, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!analysisItem.setupErrors) {
      analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
      isChanged = true;
    } else {
      let setupErrors: AnalysisSetupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
      Object.keys(setupErrors).forEach(key => {
        if (setupErrors[key] != analysisItem.setupErrors[key]) {
          analysisItem.setupErrors[key] = setupErrors[key];
          isChanged = true;
        }
      });
    }

    if (!analysisItem.baselineYear) {
      let facility: IdbFacility = this.facilityDbService.getFacilityById(analysisItem.facilityId);
      analysisItem.baselineYear = facility.sustainabilityQuestions.energyReductionBaselineYear;
      isChanged = true;
    }

    analysisItem.groups.forEach(group => {
      if (!group.groupErrors) {
        group.groupErrors = this.analysisValidationService.getGroupErrors(group);
        isChanged = true;
      } else {
        let groupErrors: GroupErrors = this.analysisValidationService.getGroupErrors(group);
        Object.keys(groupErrors).forEach(key => {
          if (groupErrors[key] != group.groupErrors[key]) {
            group.groupErrors[key] = groupErrors[key];
            isChanged = true;
          }
        });
      }
    });
    if (!analysisItem.analysisCategory) {
      analysisItem.analysisCategory = 'energy';
      isChanged = true;
    }
    return { analysisItem: analysisItem, isChanged: isChanged };
  }

  updateAccountAnalysis(analysisItem: IdbAccountAnalysisItem, account: IdbAccount, facilityAnalysisItems: Array<IdbAnalysisItem>): { analysisItem: IdbAccountAnalysisItem, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!analysisItem.analysisCategory) {
      analysisItem.analysisCategory = 'energy';
      isChanged = true;
    }

    if (!analysisItem.setupErrors) {
      analysisItem.setupErrors = this.analysisValidationService.getAccountAnalysisSetupErrors(analysisItem, facilityAnalysisItems);
      isChanged = true;
    }
    return { analysisItem: analysisItem, isChanged: isChanged };
  }


}

import { Injectable } from '@angular/core';
import { AnalysisValidationService } from '../facility/analysis/analysis-validation.service';
import { AnalysisSetupErrors, GroupErrors, IdbAccount, IdbAnalysisItem, IdbFacility } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class UpdateDbEntryService {

  constructor(private analysisValidationService: AnalysisValidationService) { }

  updateAccount(account: IdbAccount): { account: IdbAccount, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!account.electricityUnit) {
      account.electricityUnit = 'kWh';
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
    return { facility: facility, isChanged: isChanged };
  }

  updateAnalysis(analysisItem: IdbAnalysisItem): { analysisItem: IdbAnalysisItem, isChanged: boolean } {
    let isChanged: boolean = false;
    if(!analysisItem.setupErrors){
      analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
      isChanged = true;
    }else{
      let setupErrors: AnalysisSetupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
      Object.keys(setupErrors).forEach(key => {
        if (setupErrors[key] != analysisItem.setupErrors[key]) {
          analysisItem.setupErrors[key] = setupErrors[key];
          isChanged = true;
        }
      });
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
    return { analysisItem: analysisItem, isChanged: isChanged };
  }
}

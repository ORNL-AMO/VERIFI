import { Injectable } from '@angular/core';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbUtilityMeter } from '../models/idb';
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

    if (!facility.classification) {
      facility.classification = 'Manufacturing';
      isChanged = true;
    }

    return { facility: facility, isChanged: isChanged };
  }

  updateAnalysis(analysisItem: IdbAnalysisItem): { analysisItem: IdbAnalysisItem, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!analysisItem.analysisCategory) {
      analysisItem.analysisCategory = 'energy';
      isChanged = true;
    }
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
      if (facility && facility.sustainabilityQuestions) {
        analysisItem.baselineYear = facility.sustainabilityQuestions.energyReductionBaselineYear;
      } else {
        analysisItem.baselineYear = 2017;
      }
      isChanged = true;
    }

    if (analysisItem.groups) {
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

        if (group['baselineAdjustments'] != undefined) {
          group.hasDataAdjustement = group['hasBaselineAdjustement'];
          delete group['hasBaselineAdjustement'];
          group.dataAdjustments = group['baselineAdjustments'];
          delete group['baselineAdjustments'];
          isChanged = true;
        }

        if (group.baselineAdjustmentsV2 == undefined) {
          group.hasBaselineAdjustmentV2 = false;
          let yearBaselineAdjustments: Array<{ year: number, amount: number }> = new Array();
          for (let year: number = analysisItem.baselineYear + 1; year <= analysisItem.reportYear; year++) {
            yearBaselineAdjustments.push({
              year: year,
              amount: 0
            })
          }
          group.baselineAdjustmentsV2 = yearBaselineAdjustments;
          isChanged = true;
        }
      });
    }
    return { analysisItem: analysisItem, isChanged: isChanged };
  }

  updateAccountAnalysis(analysisItem: IdbAccountAnalysisItem, account: IdbAccount, facilityAnalysisItems: Array<IdbAnalysisItem>): { analysisItem: IdbAccountAnalysisItem, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!analysisItem.analysisCategory) {
      analysisItem.analysisCategory = 'energy';
      isChanged = true;
    }

    if (!analysisItem.baselineYear) {
      if (account && account.sustainabilityQuestions) {
        analysisItem.baselineYear = account.sustainabilityQuestions.energyReductionBaselineYear;
      } else {
        analysisItem.baselineYear = 2017;
      }
      isChanged = true;
    }

    if (!analysisItem.setupErrors) {
      analysisItem.setupErrors = this.analysisValidationService.getAccountAnalysisSetupErrors(analysisItem, facilityAnalysisItems);
      isChanged = true;
    }

    if (analysisItem['baselineAdjustments'] != undefined) {
      analysisItem.hasDataAdjustement = analysisItem['hasBaselineAdjustement'];
      delete analysisItem['hasBaselineAdjustement'];
      analysisItem.dataAdjustments = analysisItem['baselineAdjustments'];
      delete analysisItem['baselineAdjustments'];
      isChanged = true;
    }

    if (analysisItem.baselineAdjustmentsV2 == undefined) {
      analysisItem.hasBaselineAdjustmentV2 = false;
      let yearBaselineAdjustments: Array<{ year: number, amount: number }> = new Array();
      for (let year: number = analysisItem.baselineYear + 1; year <= analysisItem.reportYear; year++) {
        yearBaselineAdjustments.push({
          year: year,
          amount: 0
        })
      }
      analysisItem.baselineAdjustmentsV2 = yearBaselineAdjustments;
      isChanged = true;
    }

    return { analysisItem: analysisItem, isChanged: isChanged };
  }

  updateUtilityMeter(utilityMeter: IdbUtilityMeter): { utilityMeter: IdbUtilityMeter, isChanged: boolean } {
    let isChanged: boolean = false;
    let source: string = utilityMeter.source;
    if (source == 'Water') {
      isChanged = true;
      utilityMeter.source = 'Water Intake';
      utilityMeter.waterIntakeType = 'Municipal (Potable)';
    } else if (source == 'Waste Water') {
      isChanged = true;
      utilityMeter.source = 'Water Discharge';
      utilityMeter.waterDischargeType = 'Municipal Sewer';
    } else if (source == 'Other Utility') {
      isChanged = true;
      utilityMeter.source = 'Other';
    }

    if (utilityMeter.fuel == 'Fuel Oil #5') {
      isChanged = true;
      utilityMeter.fuel = "Fuel Oil #5 (Navy Special)";
    }
    return { utilityMeter: utilityMeter, isChanged: isChanged };
  }
}

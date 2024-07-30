import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility, IdbPredictorEntryDeprecated, IdbUtilityMeterGroup } from '../models/idb';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { checkSameMonth } from './upload-helper-functions';
import { PredictordbService } from '../indexedDB/predictors-db.service';
import * as XLSX from 'xlsx';
import { MeterSource } from '../models/constantsAndTypes';

@Injectable({
  providedIn: 'root'
})
export class UploadDataSharedFunctionsService {

  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private predictorDbService: PredictordbService) { }

  getMeterGroup(groupName: string, facilityId: string, newGroups: Array<IdbUtilityMeterGroup>, account: IdbAccount, meterSource: MeterSource): { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } {
    let accountGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getAccountMeterGroupsCopy();
    let facilityGroups: Array<IdbUtilityMeterGroup> = accountGroups.filter(accountGroup => { return accountGroup.facilityId == facilityId });
    let dbGroup: IdbUtilityMeterGroup = facilityGroups.find(group => {
      if (group.groupType == 'Energy' && (meterSource == 'Electricity' || meterSource == 'Natural Gas' || meterSource == 'Other Energy' || meterSource == 'Other Fuels')) {
        return group.name == groupName || group.guid == groupName
      } else if (group.groupType == 'Water' && (meterSource == 'Water Intake' || meterSource == 'Water Discharge')) {
        return group.name == groupName || group.guid == groupName
      } else if (group.groupType == 'Other') {
        return group.name == groupName || group.guid == groupName
      }
      return false;
    });
    if (dbGroup) {
      return { group: dbGroup, newGroups: newGroups }
    } else {
      let newFacilityGroups: Array<IdbUtilityMeterGroup> = newGroups.filter(group => { return group.facilityId == facilityId });
      dbGroup = newFacilityGroups.find(newGroup => {
        if (newGroup.groupType == 'Energy' && (meterSource == 'Electricity' || meterSource == 'Natural Gas' || meterSource == 'Other Energy' || meterSource == 'Other Fuels')) {
          return newGroup.name == groupName || newGroup.guid == groupName
        } else if (newGroup.groupType == 'Water' && (meterSource == 'Water Intake' || meterSource == 'Water Discharge')) {
          return newGroup.name == groupName || newGroup.guid == groupName
        } else if (newGroup.groupType == 'Other') {
          return newGroup.name == groupName || newGroup.guid == groupName
        }
        return false;
      });
      if (dbGroup) {
        return { group: dbGroup, newGroups: newGroups }
      } else if (groupName) {
        let newGroupType: 'Energy' | 'Water' | 'Other' = 'Energy';
        if (meterSource == 'Water Discharge' || meterSource == 'Water Intake') {
          newGroupType = 'Water';
        } else if (meterSource == 'Other') {
          newGroupType = 'Other';
        }
        dbGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup(newGroupType, groupName, facilityId, account.guid);
        newGroups.push(dbGroup);
        return { group: dbGroup, newGroups: newGroups }
      } else {
        return { group: undefined, newGroups: newGroups }
      }
    }
  }

    // TODO: 1668
  getPredictorData(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>, selectedAccount: IdbAccount): Array<IdbPredictorEntryDeprecated> {
    // let predictorsData = XLSX.utils.sheet_to_json(workbook.Sheets['Predictors']);
    // let predictorEntries: Array<IdbPredictorEntry> = new Array();
    // let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.getAccountPerdictorsCopy();
    // let hasNewData: boolean = false;
    // importFacilities.forEach(facility => {
    //   let facilityPredictorData = predictorsData.filter(data => { return data['Facility Name'] == facility.name });
    //   let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => { return entry.facilityId == facility.guid });
    //   let existingFacilityPredictorData: Array<PredictorData> = new Array();
    //   if (facilityPredictorEntries.length != 0) {
    //     existingFacilityPredictorData = facilityPredictorEntries[0].predictors.map(predictor => { return JSON.parse(JSON.stringify(predictor)) });
    //     existingFacilityPredictorData.forEach(predictorData => {
    //       predictorData.amount = undefined;
    //     });
    //   }
    //   if (facilityPredictorData.length != 0) {
    //     Object.keys(facilityPredictorData[0]).forEach((key) => {
    //       if (key != 'Facility Name' && key != 'Date') {
    //         let predictorIndex: number = existingFacilityPredictorData.findIndex(predictor => { return predictor.name == key });
    //         if (predictorIndex == -1) {
    //           hasNewData = true;
    //           let hasData: boolean = false;
    //           facilityPredictorData.forEach(dataItem => {
    //             if (dataItem[key] != 0) {
    //               hasData = true;
    //             }
    //           });
    //           if (hasData) {
    //             let newPredictor: PredictorData = this.predictorDbService.getNewPredictor([]);
    //             let nameTest: string = key.toLocaleLowerCase();
    //             if (!nameTest.includes('cdd') && !nameTest.includes('hdd')) {
    //               newPredictor.production = true;
    //             }
    //             newPredictor.name = key;
    //             existingFacilityPredictorData.push(newPredictor);
    //             facilityPredictorEntries.forEach(predictorEntry => {
    //               predictorEntry.predictors.push(JSON.parse(JSON.stringify(newPredictor)));
    //             });
    //           }
    //         }
    //       }
    //     });
    //   }
    //   let uploadDates: Array<Date> = new Array();
    //   facilityPredictorData.forEach(dataItem => {
    //     let dataItemDate: Date = new Date(dataItem['Date']);
    //     let facilityPredictorEntry: IdbPredictorEntry = facilityPredictorEntries.find(entry => {
    //       return checkSameMonth(dataItemDate, new Date(entry.date))
    //     });
    //     if (!facilityPredictorEntry) {
    //       facilityPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(facility.guid, selectedAccount.guid, dataItemDate);
    //       if (facilityPredictorEntries.length != 0) {
    //         facilityPredictorEntry.predictors = JSON.parse(JSON.stringify(facilityPredictorEntries[0].predictors));
    //         facilityPredictorEntry.predictors.forEach(predictor => {
    //           predictor.amount = undefined;
    //         });
    //       } else {
    //         facilityPredictorEntry.predictors = JSON.parse(JSON.stringify(existingFacilityPredictorData));
    //         facilityPredictorEntry.predictors.forEach(predictor => {
    //           predictor.amount = undefined;
    //         });
    //       }
    //     } else {
    //       uploadDates.push(dataItemDate);
    //     }
    //     Object.keys(dataItem).forEach((key) => {
    //       if (key != 'Facility Name' && key != 'Date') {
    //         let predictorIndex: number = facilityPredictorEntry.predictors.findIndex(predictor => { return predictor.name == key });
    //         if (predictorIndex != -1) {
    //           facilityPredictorEntry.predictors[predictorIndex].amount = dataItem[key];
    //         }
    //       }
    //     });
    //     if (facilityPredictorEntry.predictors.length != 0) {
    //       predictorEntries.push(JSON.parse(JSON.stringify(facilityPredictorEntry)));
    //     }
    //   });
    //   //uploading new entries means we need to update all previous entries.
    //   if (hasNewData) {
    //     facilityPredictorEntries.forEach(entry => {
    //       let uploadedAlready: Date = uploadDates.find(date => { return checkSameMonth(new Date(entry.date), date) });
    //       if (uploadedAlready == undefined) {
    //         predictorEntries.push(JSON.parse(JSON.stringify(entry)));
    //       }
    //     });
    //   }
    // })
    // return predictorEntries;
    return [];
  }
}

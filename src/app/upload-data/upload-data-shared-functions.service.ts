import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeterGroup, PredictorData } from '../models/idb';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { checkSameMonth } from './upload-helper-functions';
import { PredictordbService } from '../indexedDB/predictors-db.service';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class UploadDataSharedFunctionsService {

  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService, private accountDbService: AccountdbService,
    private predictorDbService: PredictordbService) { }

  getMeterGroup(groupName: string, facilityId: string, newGroups: Array<IdbUtilityMeterGroup>): { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } {
    let accountGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getAccountMeterGroupsCopy();
    let facilityGroups: Array<IdbUtilityMeterGroup> = accountGroups.filter(accountGroup => { return accountGroup.facilityId == facilityId });
    let dbGroup: IdbUtilityMeterGroup = facilityGroups.find(group => { return group.name == groupName || group.guid == groupName });
    if (dbGroup) {
      return { group: dbGroup, newGroups: newGroups }
    } else {
      let newFacilityGroups: Array<IdbUtilityMeterGroup> = newGroups.filter(group => { return group.facilityId == facilityId });
      dbGroup = newFacilityGroups.find(newGroup => { return newGroup.name == groupName });
      if (dbGroup) {
        return { group: dbGroup, newGroups: newGroups }
      } else if (groupName) {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        dbGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Energy", groupName, facilityId, account.guid);
        newGroups.push(dbGroup);
        return { group: dbGroup, newGroups: newGroups }
      } else {
        return { group: undefined, newGroups: newGroups }
      }
    }
  }

  getPredictorData(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>, selectedAccount: IdbAccount): Array<IdbPredictorEntry> {
    let predictorsData = XLSX.utils.sheet_to_json(workbook.Sheets['Predictors']);
    let predictorEntries: Array<IdbPredictorEntry> = new Array();
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.getAccountPerdictorsCopy();
    importFacilities.forEach(facility => {
      let facilityPredictorData = predictorsData.filter(data => { return data['Facility Name'] == facility.name });
      let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => { return entry.facilityId == facility.guid });
      let existingFacilityPredictorData: Array<PredictorData> = new Array();
      if (facilityPredictorEntries.length != 0) {
        existingFacilityPredictorData = facilityPredictorEntries[0].predictors.map(predictor => { return predictor });
      }
      if (facilityPredictorData.length != 0) {
        Object.keys(facilityPredictorData[0]).forEach((key) => {
          if (key != 'Facility Name' && key != 'Date') {
            let predictorIndex: number = existingFacilityPredictorData.findIndex(predictor => { return predictor.name == key });
            if (predictorIndex == -1) {
              let hasData: boolean = false;
              facilityPredictorData.forEach(dataItem => {
                if (dataItem[key] != 0) {
                  hasData = true;
                }
              });
              if (hasData) {
                let newPredictor: PredictorData = this.predictorDbService.getNewPredictor([]);
                let nameTest: string = key.toLocaleLowerCase();
                if (!nameTest.includes('cdd') && !nameTest.includes('hdd')) {
                  newPredictor.production = true;
                }
                newPredictor.name = key;
                existingFacilityPredictorData.push(newPredictor);
                facilityPredictorEntries.forEach(predictorEntry => {
                  predictorEntry.predictors.push(newPredictor);
                });
              }
            }
          }
        });
      }
      facilityPredictorData.forEach(dataItem => {
        let dataItemDate: Date = new Date(dataItem['Date']);
        let facilityPredictorEntry: IdbPredictorEntry = facilityPredictorEntries.find(entry => {
          return checkSameMonth(dataItemDate, new Date(entry.date))
        });
        if (!facilityPredictorEntry) {
          facilityPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(facility.guid, selectedAccount.guid, dataItemDate);
          if (facilityPredictorEntries.length != 0) {
            facilityPredictorEntry.predictors = JSON.parse(JSON.stringify(facilityPredictorEntries[0].predictors));
          } else {
            facilityPredictorEntry.predictors = JSON.parse(JSON.stringify(existingFacilityPredictorData));
          }
        }
        Object.keys(dataItem).forEach((key) => {
          if (key != 'Facility Name' && key != 'Date') {
            let predictorIndex: number = facilityPredictorEntry.predictors.findIndex(predictor => { return predictor.name == key });
            if (predictorIndex != -1) {
              facilityPredictorEntry.predictors[predictorIndex].amount = dataItem[key];
            }
          }
        });
        if (facilityPredictorEntry.predictors.length != 0) {
          predictorEntries.push(JSON.parse(JSON.stringify(facilityPredictorEntry)));
        }
      });
    })
    return predictorEntries;
  }
}
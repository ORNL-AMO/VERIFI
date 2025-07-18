import { Injectable } from '@angular/core';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import * as XLSX from 'xlsx';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { getNewIdbPredictor, IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { checkSameMonth } from './upload-helper-functions';

@Injectable({
  providedIn: 'root'
})
export class UploadDataSharedFunctionsService {

  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService, private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService
  ) { }

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
        dbGroup = getNewIdbUtilityMeterGroup(newGroupType, groupName, facilityId, account.guid);
        newGroups.push(dbGroup);
        return { group: dbGroup, newGroups: newGroups }
      } else {
        return { group: undefined, newGroups: newGroups }
      }
    }
  }

  getPredictorData(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>, importPredictors: Array<IdbPredictor>): Array<IdbPredictorData> {
    let predictorsData = XLSX.utils.sheet_to_json(workbook.Sheets['Predictors']);
    let importPredictorData: Array<IdbPredictorData> = new Array();
    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();

    importFacilities.forEach(facility => {
      let importFacilityPredictorData = predictorsData.filter(data => { return data['Facility Name'] == facility.name });
      let facilityPredictorData: Array<IdbPredictorData> = accountPredictorData.filter(pData => {
        return pData.facilityId == facility.guid
      });
      let facilityPredictors: Array<IdbPredictor> = importPredictors.filter(predictor => {
        return predictor.facilityId == facility.guid;
      });

      importFacilityPredictorData.forEach(importDataItem => {
        let predictorDataDate: Date = new Date(importDataItem['Date']);
        facilityPredictors.forEach(predictor => {
          let predictorAmount: number = importDataItem[predictor.name];
          if (isNaN(predictorAmount) == false) {
            let existingPredictorData: IdbPredictorData = facilityPredictorData.find(pData => {
              return predictor.guid == pData.predictorId && checkSameMonth(new Date(pData.date), predictorDataDate)
            });
            if (existingPredictorData) {
              existingPredictorData.amount = predictorAmount;
              importPredictorData.push(existingPredictorData);
            }else{
              let newPredictorData: IdbPredictorData = getNewIdbPredictorData(predictor);
              newPredictorData.date = predictorDataDate;
              newPredictorData.amount = predictorAmount;
              importPredictorData.push(newPredictorData);
            }
          }
        });
      });
    });
    return importPredictorData;
  }


  getPredictors(workbook: XLSX.WorkBook, importFacilities: Array<IdbFacility>): Array<IdbPredictor> {
    let predictorsData = XLSX.utils.sheet_to_json(workbook.Sheets['Predictors']);
    let importPredictors: Array<IdbPredictor> = new Array();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let hasNewData: boolean = false;
    importFacilities.forEach(facility => {
      let facilityPredictorData = predictorsData.filter(data => { return data['Facility Name'] == facility.name });
      let facilityPredictors: Array<IdbPredictor> = accountPredictors.filter(predictor => {
        return predictor.facilityId == facility.guid
      });


      if (facilityPredictorData.length != 0) {
        Object.keys(facilityPredictorData[0]).forEach((key) => {
          if (key != 'Facility Name' && key != 'Date') {
            let predictor: IdbPredictor = facilityPredictors.find(predictor => { return predictor.name == key });
            if (predictor == undefined) {
              hasNewData = true;
              let newPredictor: IdbPredictor = getNewIdbPredictor(facility.accountId, facility.guid);
              let nameTest: string = key.toLocaleLowerCase();
              if (!nameTest.includes('cdd') && !nameTest.includes('hdd')) {
                newPredictor.production = true;
              }
              newPredictor.name = key;
              importPredictors.push(newPredictor);
            }else{
              importPredictors.push(predictor);
            }
          };

        })
      }
    });
    return importPredictors;
  }
}

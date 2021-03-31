import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup, PredictorData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { ToastNotificationsService } from 'src/app/shared/toast-notifications/toast-notifications.service';
import { EditMeterFormService } from '../energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { ImportMeterFileSummary } from './import-meter.service';
import { ImportPredictorsService } from './import-predictors.service';
import { ImportMeterDataFile, ImportPredictorFile, UploadDataService } from './upload-data.service';
import * as _ from 'lodash';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
@Injectable({
  providedIn: 'root'
})
export class UploadDataRunnerService {

  constructor(private loadingService: LoadingService,
    private facilityDbService: FacilitydbService,
    private utilityMeterGroupdbService: UtilityMeterGroupdbService,
    private utilityMeterdbService: UtilityMeterdbService,
    private uploadDataService: UploadDataService,
    private editMeterFormService: EditMeterFormService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictordbService,
    private toastNotificationsService: ToastNotificationsService,
    private router: Router,
    private energyUnitsHelperService: EnergyUnitsHelperService,
    private importPredictorsService: ImportPredictorsService,
    private accountDbService: AccountdbService) { }

  async importData() {
    this.loadingService.setLoadingMessage("Importing Meters..");
    this.loadingService.setLoadingStatus(true);
    //import valid new and existing meters
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let newMeters: Array<IdbUtilityMeter> = new Array();
    let existingMeters: Array<IdbUtilityMeter> = new Array();
    let importMetersFiles: Array<{ fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }> = this.uploadDataService.importMeterFiles.getValue();
    importMetersFiles.forEach(meterFile => {
      newMeters = newMeters.concat(meterFile.importMeterFileSummary.newMeters);
      existingMeters = existingMeters.concat(meterFile.importMeterFileSummary.existingMeters);
    });

    // add meter groups
    await this.addMeterGroups(newMeters);

    //update groups behavior subject, set groupId's for meters
    let meterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupdbService.getAllByIndexRange('facilityId', selectedFacility.id).toPromise();
    this.utilityMeterGroupdbService.facilityMeterGroups.next(meterGroups);
    newMeters = this.setGroupIds(newMeters);
    existingMeters = this.setGroupIds(existingMeters);

    //add meters
    await this.addMeters(newMeters, existingMeters, selectedFacility);

    //update meter behavior subjects, updated meters needed for meter data import
    let accountMeters: Array<IdbUtilityMeter> = await this.utilityMeterdbService.getAllByIndexRange('accountId', selectedFacility.accountId).toPromise();
    this.utilityMeterdbService.accountMeters.next(accountMeters);
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == selectedFacility.id });
    this.utilityMeterdbService.facilityMeters.next(facilityMeters);

    //add meter data
    await this.addMeterData();
    await this.addPredictors(selectedFacility);
    this.finishUpload();
  }

  async addMeterGroups(newMeters: Array<IdbUtilityMeter>) {
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue();
    let uniqNeededGroups: Array<IdbUtilityMeterGroup> = new Array();
    newMeters.forEach(meter => {
      if (meter.group) {
        //check if groups need to be created for
        let checkExistsInDb: IdbUtilityMeterGroup = facilityMeterGroups.find(existingGroup => { return existingGroup.name == meter.group });
        let checkExistsInArray: IdbUtilityMeterGroup = uniqNeededGroups.find(existingGroup => { return existingGroup.name == meter.group });
        if (checkExistsInDb == undefined && checkExistsInArray == undefined) {
          let groupType: string = "Energy";
          if (meter.source == 'Water' || meter.source == 'Waste Water') {
            groupType = "Water"
          } else if (meter.source == 'Other Utility') {
            groupType = "Other"
          }
          let utilityMeterGroup: IdbUtilityMeterGroup = this.utilityMeterGroupdbService.getNewIdbUtilityMeterGroup(groupType, meter.group, meter.facilityId, meter.accountId);
          uniqNeededGroups.push(utilityMeterGroup);
        }
      }
    });
    this.loadingService.setLoadingMessage('Adding meter groups...');
    for (let i = 0; i < uniqNeededGroups.length; i++) {
      await this.utilityMeterGroupdbService.addFromImport(uniqNeededGroups[i]);
   }
  }


  async addMeters(newMeters: Array<IdbUtilityMeter>, existingMeters: Array<IdbUtilityMeter>, selectedFacility: IdbFacility) {
    this.loadingService.setLoadingMessage('Addings meters...')
    for (let i = 0; i < newMeters.length; i++) {
      newMeters[i].energyUnit = this.getMeterEnergyUnit(newMeters[i], selectedFacility);
      await this.utilityMeterdbService.addWithObservable(newMeters[i]);
    }

    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterdbService.facilityMeters.getValue();
    for (let i = 0; i < existingMeters.length; i++) {
      let facilityMeter: IdbUtilityMeter = facilityMeters.find(facilityMeter => { return facilityMeter.name == existingMeters[i].name });
      if (facilityMeter) {
        //update existing meter with form from import meter
        let form: FormGroup = this.editMeterFormService.getFormFromMeter(existingMeters[i]);
        facilityMeter = this.editMeterFormService.updateMeterFromForm(facilityMeter, form);
        facilityMeter.energyUnit = this.getMeterEnergyUnit(facilityMeter, selectedFacility);
        //update
        await this.utilityMeterdbService.updateWithObservable(facilityMeter);
      }
    }
  }

  async addMeterData() {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterdbService.facilityMeters.getValue();
    this.loadingService.setLoadingMessage('Adding meter readings..');
    //import valid meter readings
    let importMeterDataFiles: Array<ImportMeterDataFile> = this.uploadDataService.importMeterDataFiles.getValue();
    //fill out new/existing arrays from files
    let newReadings: Array<IdbUtilityMeterData> = new Array();
    let existingReadings: Array<IdbUtilityMeterData> = new Array();
    importMeterDataFiles.forEach(dataFile => {
      newReadings = newReadings.concat(dataFile.importMeterDataFileSummary.newMeterData);
      //check we aren't skiping the existing readings for that file
      if (!dataFile.skipExisting) {
        existingReadings = existingReadings.concat(dataFile.importMeterDataFileSummary.existingMeterData);
      }
    });
    //set meterId's
    newReadings = newReadings.map(reading => { return this.setMeterId(reading, facilityMeters) });
    existingReadings = existingReadings.map(reading => { return this.setMeterId(reading, facilityMeters) });
    //add new readings
    for (let i = 0; i < newReadings.length; i++) {
      await this.utilityMeterDataDbService.addWithObservable(newReadings[i]);
    }
    //add existing readings
    for (let i = 0; i < existingReadings.length; i++) {
      await this.utilityMeterDataDbService.updateWithObservable(existingReadings[i]);
    }

  }

  async addPredictors(selectedFacility: IdbFacility) {
    this.loadingService.setLoadingMessage("Adding predictor data...")
    let importPredictorFiles: Array<ImportPredictorFile> = this.uploadDataService.importPredictorsFiles.getValue();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    let newPredictors: Array<PredictorData> = new Array();
    let existingPredictors: Array<PredictorData> = new Array();
    let existingPredictorEntries: Array<any> = new Array();
    let newPredictorEntries: Array<any> = new Array();
    importPredictorFiles.forEach(file => {
      newPredictors = newPredictors.concat(file.importPredictorFileSummary.newPredictors);
      newPredictorEntries = newPredictorEntries.concat(file.importPredictorFileSummary.newPredictorEntries);
      if (!file.skipExisting) {
        existingPredictors = existingPredictors.concat(file.importPredictorFileSummary.existingPredictors);
        existingPredictorEntries = existingPredictorEntries.concat(file.importPredictorFileSummary.existingPredictorEntries);
      }
    });

    //iterate existing entry data from import (same year/month)
    for (let existingIndex = 0; existingIndex < existingPredictorEntries.length; existingIndex++) {
      let existingEntryDate: Date = new Date(existingPredictorEntries[existingIndex]["Date"]);
      //get existing entry from db objects
      let existingEntry: IdbPredictorEntry = this.importPredictorsService.getExistingEntry(existingEntryDate, facilityPredictorEntries);
      //add new predictor data to entry
      for (let i = 0; i < newPredictors.length; i++) {
        let predictorToAdd: PredictorData = newPredictors[i];
        predictorToAdd.amount = existingPredictorEntries[existingIndex][predictorToAdd.name];
        existingEntry.predictors.push(predictorToAdd);
      }
      //update existing predictor data
      for (let i = 0; i < existingPredictors.length; i++) {
        let existingPredictorIndex: number = existingEntry.predictors.findIndex(predictor => { return predictor.id == existingPredictors[i].id });
        existingEntry.predictors[existingPredictorIndex].amount = existingPredictorEntries[existingIndex][existingPredictors[i].name];
      }
      //order all predictors alphabetically and update
      existingEntry.predictors = _.orderBy(existingEntry.predictors, 'name');
      await this.predictorDbService.updateWithObservable(existingEntry);
    }

    for (let newEntryIndex = 0; newEntryIndex < newPredictorEntries.length; newEntryIndex++) {
      let newEntryDate: Date = new Date(newPredictorEntries[newEntryIndex]["Date"]);
      //get new entry
      let newEntry: IdbPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(selectedFacility.id, selectedFacility.accountId, newEntryDate);
      //add new predictor data to entry
      for (let i = 0; i < newPredictors.length; i++) {
        let predictorToAdd: PredictorData = JSON.parse(JSON.stringify(newPredictors[i]));
        predictorToAdd.amount = newPredictorEntries[newEntryIndex][predictorToAdd.name];
        newEntry.predictors.push(predictorToAdd);
      }
      //add existing predictors data from import
      for (let i = 0; i < existingPredictors.length; i++) {
        existingPredictors[i].amount = newPredictorEntries[newEntryIndex][existingPredictors[i].name];
        newEntry.predictors.push(JSON.parse(JSON.stringify(existingPredictors[i])));
      }

      //add existing predictors no in import
      for (let i = 0; i < facilityPredictors.length; i++) {
        let importPredictor: PredictorData = existingPredictors.find(predictor => { return predictor.id == facilityPredictors[i].id });
        if (!importPredictor) {
          let existingPredictorToAdd: PredictorData = JSON.parse(JSON.stringify(facilityPredictors[i]));
          existingPredictorToAdd.amount = undefined;
          newEntry.predictors.push(existingPredictorToAdd);
        }
      }

      //order all predictors alphabetically and add
      newEntry.predictors = _.orderBy(newEntry.predictors, 'name');
      await this.predictorDbService.addWithObservable(newEntry);
    }
  }

  finishUpload() {
    //update behavior subjects and reset import
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.accountDbService.selectedAccount.next(selectedAccount);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast('Data Imported!', undefined, 3500, false, "success");
    this.router.navigate(['/utility/energy-consumption']);
  }

  setGroupIds(meters: Array<IdbUtilityMeter>): Array<IdbUtilityMeter> {
    let facilityGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupdbService.facilityMeterGroups.getValue()
    meters.forEach(meter => {
      let existingGroup: IdbUtilityMeterGroup = facilityGroups.find(meterGroup => { return meterGroup.name == meter.group });
      if (existingGroup) {
        meter.groupId = existingGroup.id;
      }
    });
    return meters;
  }

  getMeterEnergyUnit(meter: IdbUtilityMeter, selectedFacility: IdbFacility): string {
    let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
    if (isEnergyUnit) {
      return meter.startingUnit;
    } else {
      let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
      if (isEnergyMeter) {
        return selectedFacility.energyUnit;
      } else {
        return undefined;
      }
    }
  }

  setMeterId(meterData: IdbUtilityMeterData, facilityMeters: Array<IdbUtilityMeter>): IdbUtilityMeterData {
    if (meterData.meterId) {
      return meterData;
    } else {
      let facilityMeter: IdbUtilityMeter = facilityMeters.find(meter => { return meter.meterNumber == meterData.meterNumber || meter.name == meterData.meterNumber });
      if (facilityMeter) {
        meterData.meterId = facilityMeter.id;
        return meterData;
      } else {
        return meterData;
      }
    }
  }

}

import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ParsedTemplate } from './upload-data-models';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbFacilityEnergyUseGroup, IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { setEnergyFootprintEnergyUse } from 'src/app/calculations/energy-footprint/energyFootprintCalculations';

@Injectable({
  providedIn: 'root',
})
export class UploadDataFootprintToolService {

  constructor(private accountDbService: AccountdbService) { }

  parseTemplate(workbook: XLSX.WorkBook): ParsedTemplate {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let energyUsesWorksheet: XLSX.WorkSheet = workbook.Sheets['Energy Uses'];
    let energyUseData: { energyUseEquipment: Array<IdbFacilityEnergyUseEquipment>, energyUseGroups: Array<IdbFacilityEnergyUseGroup> } = this.getEnergyUseData(energyUsesWorksheet, selectedAccount.guid);
    console.log(energyUseData);
    return {
      importFacilities: [],
      importMeters: [],
      predictors: [],
      predictorData: [],
      meterData: [],
      newGroups: [],
      energyUseEquipment: energyUseData.energyUseEquipment,
      energyUseGroups: energyUseData.energyUseGroups
    }
  }

  getEnergyUseData(worksheet: XLSX.WorkSheet, accountId: string): { energyUseEquipment: Array<IdbFacilityEnergyUseEquipment>, energyUseGroups: Array<IdbFacilityEnergyUseGroup> } {
    let energyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = [];
    let energyUseGroups: Array<IdbFacilityEnergyUseGroup> = [];
    let groupRow: number = 21;
    let groupName: string = worksheet['D' + groupRow]?.v;
    console.log(groupName);
    while (groupName !== undefined && groupName !== '') {
      let energyUseGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(accountId, '');
      energyUseGroup.notes = worksheet['C' + (groupRow + 1)]?.v;
      let equipmentRow: number = groupRow + 5;
      let equipmentName: string = worksheet['C' + equipmentRow]?.v;
      //TODO: parse year from worksheet
      let year: number = 2021;
      while (equipmentName !== undefined && equipmentName !== '') {
        console.log(equipmentName)
        //TODO: parse energy source
        let energySource: MeterSource = worksheet['F' + equipmentRow]?.v;
        let size: number = worksheet['G' + equipmentRow]?.v;
        //TODO: parse unit
        let unit: string = worksheet['H' + equipmentRow]?.v;
        //
        let equipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(energyUseGroup, year)
        equipment.name = equipmentName;
        // notes: string,
        equipment.operatingConditionsData = [{
          year: year,
          hoursOfOperation: worksheet['CV' + equipmentRow]?.v * 100,
          loadFactor: worksheet['CW' + equipmentRow]?.v * 100,
          dutyFactor: worksheet['CX' + equipmentRow]?.v * 100,
          efficiency: 100
        }];
        //TODO: check Override Calculated Value
        equipment.utilityData = [{
          energySource: energySource,
          size: size,
          numberOfEquipment: 1,
          units: unit,
          energyUse: [{
            year: year, energyUse: 0, overrideEnergyUse: false
          }]
        }]
        setEnergyFootprintEnergyUse(equipment);
        energyUseEquipment.push(equipment);
        equipmentRow = equipmentRow + 1;
        equipmentName = worksheet['C' + equipmentRow]?.v;
      }
      energyUseGroups.push(energyUseGroup);
      groupRow = groupRow + 41;
      console.log('next group row', groupRow);
      groupName = worksheet['D' + groupRow]?.v;
    }
    return { energyUseEquipment: energyUseEquipment, energyUseGroups: energyUseGroups };
  }
}

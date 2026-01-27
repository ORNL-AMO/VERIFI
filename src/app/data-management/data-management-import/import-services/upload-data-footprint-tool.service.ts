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
    let mainWorksheet: XLSX.WorkSheet = workbook.Sheets['Main'];
    let currentYearCell: number = parseInt(mainWorksheet['K13']?.v);
    let numYearsCell: number = parseInt(mainWorksheet['K14']?.v);
    let years: Array<number> = [];
    for (let i = 0; i < numYearsCell; i++) {
      years.push(currentYearCell - i);
    }

    let energyUsesWorksheet: XLSX.WorkSheet = workbook.Sheets['Energy Uses'];
    let energyUseData: { energyUseEquipment: Array<IdbFacilityEnergyUseEquipment>, energyUseGroups: Array<IdbFacilityEnergyUseGroup> } = this.getEnergyUseData(energyUsesWorksheet, selectedAccount.guid, years);
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

  getEnergyUseData(worksheet: XLSX.WorkSheet, accountId: string, years: Array<number>): { energyUseEquipment: Array<IdbFacilityEnergyUseEquipment>, energyUseGroups: Array<IdbFacilityEnergyUseGroup> } {
    let energyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = [];
    let energyUseGroups: Array<IdbFacilityEnergyUseGroup> = [];
    let groupRow: number = 21;
    let groupName: string = worksheet['D' + groupRow]?.v;
    while (groupName !== undefined && groupName !== '') {
      let energyUseGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(accountId, '');
      energyUseGroup.notes = worksheet['C' + (groupRow + 1)]?.v;
      let equipmentRow: number = groupRow + 5;
      let equipmentName: string = worksheet['C' + equipmentRow]?.v;
      let yearColumns = ['CV', 'DF', 'DP', 'DZ', 'EJ', 'ET', 'FD', 'FN', 'FX', 'GH', ' GR'];
      while (equipmentName !== undefined && equipmentName !== '') {
        //TODO: parse energy source (Other)
        let energySource: MeterSource = worksheet['F' + equipmentRow]?.v;
        let size: number = worksheet['G' + equipmentRow]?.v;
        let unit: string = this.getUnit(worksheet['H' + equipmentRow]?.v);

        let equipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(energyUseGroup, years[0])
        equipment.name = equipmentName;
        equipment.operatingConditionsData = new Array();
        let utilityEnergyUse: Array<{ year: number, energyUse: number, overrideEnergyUse: boolean }> = new Array();

        years.forEach((year, index) => {
          //need to use yearcolumns to get correct row values
          let yearHoursOfOperation = worksheet[yearColumns[index] + equipmentRow]?.v;
        
          let nextColumn = this.getNextExcelColumn(yearColumns[index]);
          let yearLoadFactor = worksheet[nextColumn + equipmentRow]?.v;
          nextColumn = this.getNextExcelColumn(nextColumn);
          let yearDutyFactor = worksheet[nextColumn + equipmentRow]?.v;
          if (!isNaN(yearHoursOfOperation) && !isNaN(yearLoadFactor) && !isNaN(yearDutyFactor)) {
            equipment.operatingConditionsData.push({
              year: year,
              hoursOfOperation: yearHoursOfOperation * 100,
              loadFactor: yearLoadFactor * 100,
              dutyFactor: yearDutyFactor * 100,
              efficiency: 100
            });
            //TODO: handle override with conversion.
            // let energyConsumptionCol = this.getNextExcelColumn(nextColumn);
            // let unitPerYearCol = this.getNextExcelColumn(energyConsumptionCol);
            // let overrideEnergyUseCol = this.getNextExcelColumn(unitPerYearCol);
            utilityEnergyUse.push({ year: year, energyUse: 0, overrideEnergyUse: false })
          }
        });
        
        equipment.utilityData = [{
          energySource: energySource,
          size: size,
          numberOfEquipment: 1,
          units: unit,
          energyUse: utilityEnergyUse
        }]
        setEnergyFootprintEnergyUse(equipment);
        energyUseEquipment.push(equipment);
        equipmentRow = equipmentRow + 1;
        equipmentName = worksheet['C' + equipmentRow]?.v;
      }
      energyUseGroups.push(energyUseGroup);
      groupRow = groupRow + 41;
      groupName = worksheet['D' + groupRow]?.v;
    }
    return { energyUseEquipment: energyUseEquipment, energyUseGroups: energyUseGroups };
  }

  getUnit(paresedUnit: string): string {
    if (paresedUnit == 'HP') {
      return 'hp';
    } else if (paresedUnit == 'Watts') {
      return 'W';
    } else if (paresedUnit == 'Killowatts') {
      return 'kW';
    } else if (paresedUnit == 'Megawatts') {
      return 'MW';
    } else if (paresedUnit == 'Therms/hr') {
      return 'thermshr';
    } else if (paresedUnit == 'Dekatherms/hr') {
      return 'dekathermshr';
    } else if (paresedUnit == 'MMBtu/hr') {
      return 'MMBtu/hr';
    }
    return 'MMBtu/hr';
  }


  getNextExcelColumn(col: string): string {
    // Convert column label to number
    let num = 0;
    for (let i = 0; i < col.length; i++) {
      num = num * 26 + (col.charCodeAt(i) - 64);
    }
    // Increment to get next column
    num += 1;
    // Convert number back to column label
    let nextCol = '';
    while (num > 0) {
      let rem = (num - 1) % 26;
      nextCol = String.fromCharCode(65 + rem) + nextCol;
      num = Math.floor((num - 1) / 26);
    }
    return nextCol;
  }
}

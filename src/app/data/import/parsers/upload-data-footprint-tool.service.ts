import { IdbEntry } from '@data/models/idbModels/idbEntry';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { FileReference, ParsedTemplate } from '@data/import/spreadsheet-import.models';
import { IdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbFacilityEnergyUseGroup, IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { MeterSource } from '@data/models/constantsAndTypes';
import { getEnergyUseUnit, setEnergyFootprintEnergyUse } from '@domain/calculations/energy-footprint/energyFootprintCalculations';

@Injectable({
  providedIn: 'root',
})
export class UploadDataFootprintToolService {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly groupIdentities = new WeakMap<IdbFacilityEnergyUseGroup, IdbEntry>();
  private readonly equipmentIdentities = new WeakMap<IdbFacilityEnergyUseEquipment, IdbEntry & { energyUseGroupId: string }>();


  parseTemplate(workbook: XLSX.WorkBook): ParsedTemplate {
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
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
      energyUseGroup.name = groupName;
      let equipmentRow: number = groupRow + 5;
      let equipmentName: string = worksheet['C' + equipmentRow]?.v;
      let yearColumns: Array<{ year: number, column: string }> = [
        { year: 2026, column: 'BL' },
        { year: 2025, column: 'BV' },
        { year: 2024, column: 'CF' },
        { year: 2023, column: 'CP' },
        { year: 2022, column: 'CZ' },
        { year: 2021, column: 'CV' },
        { year: 2020, column: 'DF' },
        { year: 2019, column: 'DP' },
        { year: 2018, column: 'DZ' },
        { year: 2017, column: 'EJ' },
        { year: 2016, column: 'ET' },
        { year: 2015, column: 'FD' },
        { year: 2014, column: 'FN' },
        { year: 2013, column: 'FX' },
        { year: 2012, column: 'GH' },
        { year: 2011, column: 'GR' }
      ];

      // let yearColumns = ['CV', 'DF', 'DP', 'DZ', 'EJ', 'ET', 'FD', 'FN', 'FX', 'GH', ' GR'];
      let energyGroupEquipment: Array<IdbFacilityEnergyUseEquipment> = new Array();
      while (equipmentName !== undefined && equipmentName !== '') {
        //TODO: parse energy source (Other)
        let energySource: MeterSource = worksheet['F' + equipmentRow]?.v;
        let size: number = worksheet['G' + equipmentRow]?.v;
        let unit: string = this.getUnit(worksheet['H' + equipmentRow]?.v);

        let equipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(energyUseGroup, years[0])
        equipment.name = equipmentName;
        if (equipment.name) {
          equipment.operatingConditionsData = new Array();
          let utilityEnergyUse: Array<{ year: number, energyUse: number, overrideEnergyUse: boolean, energyUseUnit: string }> = new Array();

          years.forEach((year, index) => {
            //need to use yearcolumns to get correct row values
            let column: string = yearColumns.find(col => { return col.year == year })?.column;
            let yearHoursOfOperation = worksheet[column + equipmentRow]?.v;

            let nextColumn = this.getNextExcelColumn(column);
            let yearLoadFactor = worksheet[nextColumn + equipmentRow]?.v;
            nextColumn = this.getNextExcelColumn(nextColumn);
            let yearDutyFactor = worksheet[nextColumn + equipmentRow]?.v;
            if (!isNaN(yearHoursOfOperation) && !isNaN(yearLoadFactor) && !isNaN(yearDutyFactor)) {
              equipment.operatingConditionsData.push({
                year: year,
                hoursOfOperation: yearHoursOfOperation,
                loadFactor: yearLoadFactor * 100,
                dutyFactor: yearDutyFactor * 100,
                efficiency: 100
              });
              //TODO: handle override with conversion.
              // let energyConsumptionCol = this.getNextExcelColumn(nextColumn);
              // let unitPerYearCol = this.getNextExcelColumn(energyConsumptionCol);
              // let overrideEnergyUseCol = this.getNextExcelColumn(unitPerYearCol);
              let energyUseUnit: string = getEnergyUseUnit(unit);
              utilityEnergyUse.push({ year: year, energyUse: 0, overrideEnergyUse: false, energyUseUnit: energyUseUnit });
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
          energyGroupEquipment.push(equipment);
        }
        equipmentRow = equipmentRow + 1;
        equipmentName = worksheet['C' + equipmentRow]?.v;
      }
      if (energyUseGroup.name && energyGroupEquipment.length > 0) {
        energyUseGroups.push(energyUseGroup);
        energyGroupEquipment.forEach(equipment => {
          energyUseEquipment.push(equipment);
        });
      }
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
    } else if (paresedUnit == 'Kilowatts') {
      return 'kW';
    } else if (paresedUnit == 'Megawatts') {
      return 'MW';
    } else if (paresedUnit == 'Therms/hr') {
      return 'thermshr';
    } else if (paresedUnit == 'Dekatherms/hr') {
      return 'dekathermshr';
    } else if (paresedUnit == 'MMBtu/hr') {
      return 'MMBtuhr';
    }
    return 'MMBtuhr';
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

  setSelectedFacility(fileReference: FileReference): FileReference {
    const facility = this.accountWorkspaceStore.facilities().find(facility => facility.guid === fileReference.selectedFacilityId
      && facility.accountId === this.accountWorkspaceStore.account()?.guid);
    if (!facility) throw new Error('Select an available facility for this footprint upload.');
    const savedGroups = this.accountWorkspaceQuery.getFacilityEnergyUseGroups(facility.guid);
    const savedEquipment = this.accountWorkspaceQuery.getFacilityEnergyUseEquipment(facility.guid);
    // Retain parsed identities so changing facilities cannot reuse a prior owner's GUID or key.
    const identity = (entry: IdbEntry): IdbEntry => ({ guid: entry.guid, createdDate: entry.createdDate, modifiedDate: entry.modifiedDate });
    for (const group of fileReference.facilityEnergyUseGroups) {
      if (!this.groupIdentities.has(group)) this.groupIdentities.set(group, identity(group));
    }
    for (const equipment of fileReference.facilityEnergyUseEquipment) {
      if (!this.equipmentIdentities.has(equipment)) this.equipmentIdentities.set(equipment, { ...identity(equipment), energyUseGroupId: equipment.energyUseGroupId });
    }
    for (const group of fileReference.facilityEnergyUseGroups) {
      const parsedGroup = this.groupIdentities.get(group)!;
      const existingGroup = savedGroups.find(saved => saved.name.toLowerCase() === group.name.toLowerCase());
      group.guid = existingGroup?.guid ?? parsedGroup.guid;
      group.createdDate = existingGroup?.createdDate ?? parsedGroup.createdDate;
      if (existingGroup) group.id = existingGroup.id; else delete group.id;
      group.facilityId = facility.guid;
      for (const equipment of fileReference.facilityEnergyUseEquipment) {
        const parsedItem = this.equipmentIdentities.get(equipment)!;
        if (parsedItem.energyUseGroupId !== parsedGroup.guid) continue;
        const existingItem = existingGroup && savedEquipment.find(saved => saved.energyUseGroupId === existingGroup.guid
          && saved.name.toLowerCase() === equipment.name.toLowerCase());
        equipment.guid = existingItem?.guid ?? parsedItem.guid;
        equipment.createdDate = existingItem?.createdDate ?? parsedItem.createdDate;
        if (existingItem) equipment.id = existingItem.id; else delete equipment.id;
        equipment.energyUseGroupId = group.guid;
        equipment.facilityId = facility.guid;
      }
    }
    return fileReference;
  }
}

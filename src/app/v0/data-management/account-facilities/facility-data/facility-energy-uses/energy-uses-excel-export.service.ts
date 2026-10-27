import { computed, inject, Injectable } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import * as ExcelJS from 'exceljs';
import { capacityUnitToExcel, ENERGY_USES_HEADERS, ENERGY_USES_SHEET, escapeMeterGroupName } from './energy-uses-excel-format';
export { ENERGY_USES_HEADERS } from './energy-uses-excel-format';

export const ENERGY_USES_TEMPLATE_URL = 'assets/csv_templates/VERIFI-Energy-Uses-Template.xlsx';

export interface EnergyUsesExportData {
  year: number;
  rows: Array<Array<string | number | null>>;
  hasExcessUtilityTypes: boolean;
}

export function getEnergyUsesExportYears(equipment: readonly Readonly<IdbFacilityEnergyUseEquipment>[]): number[] {
  const years = equipment.flatMap(item => [
    ...(item.operatingConditionsData ?? []).map(data => data.year),
    ...(item.utilityData ?? []).flatMap(utility => (utility.energyUse ?? []).map(data => data.year))
  ]);
  return [...new Set(years)].sort((a, b) => a - b);
}

@Injectable({ providedIn: 'root' })
export class EnergyUsesExcelExportService {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  readonly exportYears = computed(() => getEnergyUsesExportYears(this.accountWorkspaceStore.energyUseEquipment()));

  prepareExportData(year: number): EnergyUsesExportData {
    const exportData: EnergyUsesExportData = { year, rows: [], hasExcessUtilityTypes: false };
    const facilities = this.accountWorkspaceStore.facilities();
    const energyUseGroups = this.accountWorkspaceStore.energyUseGroups();
    const meterGroups = this.accountWorkspaceStore.meterGroups();
    const equipment = this.accountWorkspaceStore.energyUseEquipment().filter(item =>
      (item.operatingConditionsData ?? []).some(data => data.year === year)
      || (item.utilityData ?? []).some(utility => (utility.energyUse ?? []).some(data => data.year === year))
    );
    
    const groupedEquipment = new Map<string, Map<string, typeof equipment>>();
    for (const item of equipment) {
      let groups = groupedEquipment.get(item.facilityId);
      if (!groups) {
        groups = new Map();
        groupedEquipment.set(item.facilityId, groups);
      }
      const groupEquipment = groups.get(item.energyUseGroupId) ?? [];
      groupEquipment.push(item);
      groups.set(item.energyUseGroupId, groupEquipment);
    }
    const orderedEquipment = [...groupedEquipment.values()]
      .flatMap(groups => [...groups.values()].flat());
    for (const item of orderedEquipment) {
      const facility = facilities.find(value => value.guid === item.facilityId);
      const group = energyUseGroups.find(value => value.guid === item.energyUseGroupId && value.facilityId === item.facilityId);
      const utilities = item.utilityData ?? [];
      const conditions = (item.operatingConditionsData ?? []).filter(data => data.year === year);
      if (utilities.length > 2) {
        exportData.hasExcessUtilityTypes = true;
      }
      const meterGroupNames = (item.utilityMeterGroupIds ?? []).map(guid => {
        const meterGroup = meterGroups.find(value => value.guid === guid && value.facilityId === item.facilityId);
        return meterGroup ? escapeMeterGroupName(meterGroup.name) : '';
      });

      const operating = conditions[0];
      const row: Array<string | number | null> = [
        facility?.name ?? '',
        group?.name ?? '',
        item.name,
        item.equipmentType,
        meterGroupNames.join('; '), item.notes ?? '',
        operating?.hoursOfOperation ?? null,
        operating?.loadFactor ?? null,
        operating?.dutyFactor ?? null,
        utilities.some(utility => utility.energySource === 'Electricity') ? operating?.efficiency ?? null : null
      ];
      for (let index = 0; index < 2; index++) {
        const utility = utilities[index];
        const annual = utility?.energyUse?.find(data => data.year === year);
        row.push(
          utility?.energySource ?? null,
          utility?.size ?? null,
          capacityUnitToExcel(utility?.units) ?? null,
          utility?.numberOfEquipment ?? null,
          annual?.energyUse ?? null,
          annual?.energyUseUnit ?? null
        );
      }
      exportData.rows.push(row);
    }
    return exportData;
  }

  async createExport(exportData: EnergyUsesExportData): Promise<Blob> {
    if (exportData.hasExcessUtilityTypes) {
      throw new Error('Some equipment has more than two utility types. Reduce it to two utility types before exporting.');
    }
    const template = await new Promise<ArrayBuffer>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', ENERGY_USES_TEMPLATE_URL, true);
      request.responseType = 'arraybuffer';

      request.onload = () => (request.status === 0 || (request.status >= 200 && request.status < 300)) && request.response?.byteLength
        ? resolve(request.response)
        : reject(new Error('The Energy Uses template could not be loaded.'));
      request.onerror = () => reject(new Error('The Energy Uses template could not be loaded.'));
      request.send();
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(template);
    this.fillWorkbook(workbook, exportData);
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  fillWorkbook(workbook: ExcelJS.Workbook, exportData: EnergyUsesExportData): void {
    const sheet = workbook.getWorksheet(ENERGY_USES_SHEET);
    const styles = ENERGY_USES_HEADERS.map((_, index) => ({ ...sheet.getCell(2, index + 1).style }));
    const validations = ENERGY_USES_HEADERS.map((_, index) => sheet.getCell(2, index + 1).dataValidation);
    
    sheet.removeTable('EnergyUses');
    sheet.autoFilter = { from: 'A1', to: { row: exportData.rows.length + 1, column: ENERGY_USES_HEADERS.length } };
    exportData.rows.forEach((values, index) => {
      const row = sheet.getRow(index + 2);
      row.values = values;
      row.height = 23;
      ENERGY_USES_HEADERS.forEach((__, column) => {
        const cell = row.getCell(column + 1);
        cell.style = { ...styles[column] };
      
        if ([6, 7, 8, 9, 11, 14, 17, 20].includes(column)) {
          cell.numFmt = 'General';
        }
        if (validations[column]?.type) {
          const validation = { ...validations[column] };
          if (validation.type === 'custom') {
            validation.formulae = validation.formulae.map(formula => String(formula).replace(/([JKQ])2\b/g, `$1${index + 2}`));
          }
          cell.dataValidation = validation;
        }
      });
    });
    workbook.views = [{ firstSheet: 1, activeTab: 1, visibility: 'visible', x: 0, y: 0, width: 12000, height: 9000 }];
  }

  download(blob: Blob, year: number): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    try {
      link.href = url;
      link.download = `VERIFI-Energy-Uses-${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      URL.revokeObjectURL(url);
    }
  }
}

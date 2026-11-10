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
  readonly facilities = this.accountWorkspaceStore.facilities;

  prepareExportData(year: number, selectedFacilityGuids: ReadonlySet<string>): EnergyUsesExportData {
    const exportData: EnergyUsesExportData = { year, rows: [], hasExcessUtilityTypes: false };
    const facilities = this.accountWorkspaceStore.facilities();
    const energyUseGroups = this.accountWorkspaceStore.energyUseGroups();
    const meterGroups = this.accountWorkspaceStore.meterGroups();
    const equipment = this.accountWorkspaceStore.energyUseEquipment().filter(item =>
      selectedFacilityGuids.has(item.facilityId) && (
        (item.operatingConditionsData ?? []).some(data => data.year === year)
        || (item.utilityData ?? []).some(utility => (utility.energyUse ?? []).some(data => data.year === year)))
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
    if (!sheet || ENERGY_USES_HEADERS.some((header, column) => sheet.getCell(1, column + 1).value !== header)) {
      throw new Error('The Energy Uses export template must have the 22 original headers in their original order.');
    }
    const table = sheet.getTable('EnergyUses');
    if (table) {

      const model = (table as ExcelJS.Table & {
        model: {
          headerRow: boolean;
          tableRef: string;
          autoFilterRef: string
        }
      }).model;
      const reservedLastRow = Number(model.tableRef.match(/\d+$/)?.[0] ?? sheet.rowCount);
      const lastRow = Math.max(reservedLastRow, exportData.rows.length + 1);
      const range = `A1:${sheet.getColumn(ENERGY_USES_HEADERS.length).letter}${lastRow}`;
      model.headerRow = true;
      model.tableRef = range;
      model.autoFilterRef = range;
    } else {
      sheet.autoFilter = {
        from: 'A1',
        to: { row: Math.max(2, sheet.rowCount, exportData.rows.length + 1), column: ENERGY_USES_HEADERS.length }
      };
    }
    exportData.rows.forEach((values, index) => {
      ENERGY_USES_HEADERS.forEach((_, column) => {
        const value = values[column] ?? null;
        if (typeof value === 'number' && !Number.isFinite(value)) {
          throw new Error(`Cannot export a nonfinite number in row ${index + 2}, ${ENERGY_USES_HEADERS[column]}.`);
        }
        if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
          throw new Error('Equipment export values must be ordinary text or finite numbers.');
        }
        sheet.getCell(index + 2, column + 1).value = value;
      });
    });
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

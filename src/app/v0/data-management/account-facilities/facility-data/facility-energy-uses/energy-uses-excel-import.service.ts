import { inject, Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { EnergySources, MeterSource } from '@data/models/constantsAndTypes';
import { getNewIdbFacilityEnergyUseGroup, IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { EnergyEquipmentOperatingConditionsData, EquipmentType, EquipmentUtilityData, getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { calculateTotalEquipmentEnergyUse } from '@app/domain/calculations/energy-footprint/energyFootprintCalculations';
import { CAPACITY_UNITS, capacityUnitFromExcel, capacityUnitToExcel, ENERGY_UNITS, ENERGY_USES_HEADERS, ENERGY_USES_SHEET, INDUSTRIAL_SYSTEMS, parseMeterGroupNames } from './energy-uses-excel-format';

export interface EnergyUsesImportRow {
  importedRow: number;
  values: unknown[];
  errors: string[];
}

export interface EnergyUsesWorkbook {
  filename: string;
  year: number | null;
  rows: EnergyUsesImportRow[];
}

export interface EnergyUsesImportChange {
  field: string;
  before: string;
  after: string;
}

export type EnergyUsesImportAction = 'Create' | 'Update' | 'Unchanged' | 'Error';

export interface EnergyUsesImportRowPreview {
  importedRow: number;
  facility: string;
  group: string;
  equipment: string;
  industrialSystem: string;
  action: EnergyUsesImportAction;
  skipped?: boolean;
  errors: string[];
  changes: EnergyUsesImportChange[];
  updatedEquipment?: IdbFacilityEnergyUseEquipment;
}

export interface EnergyUsesImportPreview {
  filename: string;
  accountGuid: string;
  revision: number;
  year: number;
  rows: EnergyUsesImportRowPreview[];
  newGroups: IdbFacilityEnergyUseGroup[];
  created: number;
  updated: number;
  unchanged: number;
  errorRows: number;
  canImport: boolean;
}

function normalizeEnergyUseName(value: string): string { 
  return value.trim().toLowerCase(); 
}
const isBlank = (value: unknown): boolean => value == null || (typeof value === 'string' && !value.trim());
const isText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const key = (...values: string[]): string => JSON.stringify(values.map(normalizeEnergyUseName));
const ENERGY_USES_IMPORT_DEFAULTS = {
  hoursOfOperation: 8760, loadFactor: 100, dutyFactor: 100, efficiency: 100,
  capacity: 1, capacityUnit: 'hp', count: 1, energyUnit: 'MMBtu'
} as const;

@Injectable({ providedIn: 'root' })
export class EnergyUsesExcelImportService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly transactions = inject(IndexedDbTransactionService);

  async readFile(file: File): Promise<EnergyUsesWorkbook> {
    return this.parseWorkbook(await file.arrayBuffer(), file.name);
  }

  preparePreview(workbookData: EnergyUsesWorkbook, year: number, skippedRows: ReadonlySet<number> = new Set()): EnergyUsesImportPreview {
    if (!skippedRows.size) {
      return this.buildPreview(workbookData, year);
    }
    const active = this.buildPreview({
      ...workbookData,
      rows: workbookData.rows.filter(row => !skippedRows.has(row.importedRow))
    }, year);
    const original = this.buildPreview(workbookData, year);
    return this.combinePreviewRows(active, original, skippedRows);
  }

  private combinePreviewRows(
    active: EnergyUsesImportPreview,
    original: EnergyUsesImportPreview,
    skippedRows: ReadonlySet<number>
  ): EnergyUsesImportPreview {
    const included = new Map(active.rows.map(row => [row.importedRow, row]));
    return {
      ...active,
      rows: original.rows.map(row => skippedRows.has(row.importedRow)
        ? { ...row, skipped: true, updatedEquipment: undefined }
        : included.get(row.importedRow))
    };
  }

  private buildPreview(workbookData: EnergyUsesWorkbook, year: number): EnergyUsesImportPreview {
    const accountGuid = this.workspace.account()?.guid;
    const revision = this.workspace.revision();
    if (!accountGuid || !Number.isInteger(year)) {
      throw new Error('Select an active account and enter a year.');
    }
    const facilities = this.workspace.facilities().filter(facility => facility.accountId === accountGuid);
    const groups = this.workspace.energyUseGroups().filter(group => group.accountId === accountGuid);
    const equipment = this.workspace.energyUseEquipment().filter(item => item.accountId === accountGuid);
    const meters = this.workspace.meterGroups();
    const newGroups = new Map<string, IdbFacilityEnergyUseGroup>();
    const workbookKeys = workbookData.rows.map(row => key(...[0, 1, 2, 3].map(column => isText(row.values[column]))));
    const rows = workbookData.rows.map(source => {
      const cells = source.values;
      const row: EnergyUsesImportRowPreview = {
        importedRow: source.importedRow,
        facility: isText(cells[0]),
        group: isText(cells[1]),
        equipment: isText(cells[2]),
        industrialSystem: isText(cells[3]),
        action: 'Error',
        errors: [...source.errors],
        changes: []
      };
      const error = (message: string) => {
        if (!row.errors.includes(message)) {
          row.errors.push(message);
        }
      };
      const display = (value: unknown): string => value == null ? 'Blank' : Array.isArray(value) ? value.join('; ') || 'None' : String(value);
      const change = (field: string, before: unknown, after: unknown) => {
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          row.changes.push({
            field,
            before: display(before),
            after: display(after)
          });
        }
      };
      const numeric = (column: number): number | undefined => {
        const value = cells[column];
        return typeof value === 'number' ? value : undefined;
      };
      for (const column of [0, 1, 2, 3]) {
        if (!isText(cells[column])) { error(`${ENERGY_USES_HEADERS[column]} is required.`); }
      }
      if (workbookKeys.filter(identity => identity === key(...[0, 1, 2, 3].map(column => isText(cells[column])))).length > 1) {
        error('Duplicate equipment identity in this workbook. Keep one row per equipment.');
      }
      const system = INDUSTRIAL_SYSTEMS.find(value => normalizeEnergyUseName(value) === normalizeEnergyUseName(row.industrialSystem));
      if (!system) { error('Industrial System is not supported.'); }
      const facility = facilities.find(item => key(item.name) === key(row.facility));
      if (!facility) {
        error('Facility does not exist in this account.');
        return row;
      }
      const groupKey = key(facility.guid, row.group);
      let group: IdbFacilityEnergyUseGroup = groups.find(item => key(item.facilityId, item.name) === groupKey) ?? newGroups.get(groupKey);
      if (!group && row.group) {
        group = getNewIdbFacilityEnergyUseGroup(accountGuid, facility.guid);
        group.name = row.group;
        newGroups.set(groupKey, group);
      }
      if (!group || !system) { return row; }
      const existing = equipment.find(item => key(item.facilityId, item.energyUseGroupId, item.name, item.equipmentType) === key(facility.guid, group.guid, row.equipment, system));
      const proposed: IdbFacilityEnergyUseEquipment = existing ? structuredClone(existing) : getNewIdbFacilityEnergyUseEquipment(group, year);
      for (const utility of existing?.utilityData ?? []) {
        if ((utility.energyUse ?? []).filter(entry => entry.year === year).length > 1) {
          error(`Duplicate ${utility.energySource} energy records exist for ${year}.`);
        }
      }
      if (!existing) {
        proposed.name = row.equipment;
        proposed.equipmentType = system as EquipmentType;
        proposed.operatingConditionsData = [];
      }
      if (!isBlank(cells[5])) {
        const notes = String(cells[5]);
        change('Notes', proposed.notes, notes);
        proposed.notes = notes;
      }
      if (!isBlank(cells[4])) {
        try {
          const ids: string[] = [];
          for (const name of parseMeterGroupNames(String(cells[4]))) {
            const found = meters.find(item => key(item.facilityId, item.name) === key(facility.guid, name));
            if (!found) {
              error(`Meter group "${name}" does not exist in this facility.`);
            }
            else if (!ids.includes(found.guid)) {
              ids.push(found.guid);
            }
          }
          const currentIds = proposed.utilityMeterGroupIds ?? [];
          if (JSON.stringify([...currentIds].sort()) !== JSON.stringify([...ids].sort())) {
            const names = (values: string[]) => values.map(id => meters.find(meter => meter.guid === id)?.name ?? id);
            change('Utility meter group links', names(currentIds), names(ids));
            proposed.utilityMeterGroupIds = ids;
          }
        } catch (failure) {
          error(failure instanceof Error ? failure.message : 'Invalid meter group names.');
        }
      }
      const incomingSources = [10, 16].map(column => EnergySources.find(value => normalizeEnergyUseName(value) === normalizeEnergyUseName(isText(cells[column]))));
      const includesElectricity = incomingSources.includes('Electricity');
      const annualConditions = (proposed.operatingConditionsData ?? []).filter(value => value.year === year);
      if (annualConditions.length > 1) { 
        error(`Duplicate operating-condition records exist for ${year}.`); 
      }
      const operating: EnergyEquipmentOperatingConditionsData = annualConditions[0] ?? {
        year, hoursOfOperation: ENERGY_USES_IMPORT_DEFAULTS.hoursOfOperation, loadFactor: ENERGY_USES_IMPORT_DEFAULTS.loadFactor,
        dutyFactor: ENERGY_USES_IMPORT_DEFAULTS.dutyFactor, efficiency: ENERGY_USES_IMPORT_DEFAULTS.efficiency
      };
      const annualFields = [{ column: 6, field: 'hoursOfOperation' }, { column: 7, field: 'loadFactor' },
      { column: 8, field: 'dutyFactor' }] as const;
      for (const field of annualFields) {
        const supplied = numeric(field.column) ?? operating[field.field] ?? ENERGY_USES_IMPORT_DEFAULTS[field.field];
        if (supplied !== undefined) {
          change(ENERGY_USES_HEADERS[field.column], operating[field.field], supplied);
          operating[field.field] = supplied;
        }
      }
      if (includesElectricity) {
        const efficiency = numeric(9) ?? operating.efficiency ?? ENERGY_USES_IMPORT_DEFAULTS.efficiency;
        if (efficiency !== undefined) { 
          change('Efficiency (%)', annualConditions[0]?.efficiency, efficiency); operating.efficiency = efficiency; 
        }
      }
      if (!annualConditions.length) { 
        proposed.operatingConditionsData.push(operating); 
      }
      const importedSources = new Set<string>();
      for (const [slot, column] of [10, 16].entries()) {
        const sourceType = incomingSources[slot];
        if (!sourceType || importedSources.has(sourceType)) { 
          continue; 
        }
        importedSources.add(sourceType);
        const current = proposed.utilityData.find(utility => utility.energySource === sourceType);
        const utility: EquipmentUtilityData = current ?? {
          energySource: sourceType as MeterSource, size: ENERGY_USES_IMPORT_DEFAULTS.capacity,
          units: ENERGY_USES_IMPORT_DEFAULTS.capacityUnit, numberOfEquipment: ENERGY_USES_IMPORT_DEFAULTS.count, energyUse: []
        };
        const capacity = numeric(column + 1) ?? utility.size ?? ENERGY_USES_IMPORT_DEFAULTS.capacity;
        const count = numeric(column + 3) ?? utility.numberOfEquipment ?? ENERGY_USES_IMPORT_DEFAULTS.count;
        const suppliedEnergy = numeric(column + 4);
        const unit = isBlank(cells[column + 2]) ? isBlank(utility.units) ? ENERGY_USES_IMPORT_DEFAULTS.capacityUnit : utility.units : capacityUnitFromExcel(isText(cells[column + 2]));
        if (!CAPACITY_UNITS.includes(unit)) { 
          error(`${sourceType}: a supported rated power/capacity unit is required.`); 
        }
        if (capacity !== undefined) { 
          change(`${sourceType} capacity`, utility.size, capacity); utility.size = capacity; 
        }
        if (count !== undefined) { 
          change(`${sourceType} count`, utility.numberOfEquipment, count); utility.numberOfEquipment = count; 
        }
        change(`${sourceType} capacity unit`, capacityUnitToExcel(utility.units), capacityUnitToExcel(unit));
        utility.units = unit;
        if (!Number.isFinite(utility.size) || utility.size < 0) { 
          error(`${sourceType}: capacity is required and must be zero or greater.`); }
        const annualEntries = (utility.energyUse ?? []).filter(entry => entry.year === year);
        if (annualEntries.length > 1) { 
          error(`Duplicate ${sourceType} energy records exist for ${year}.`); 
        }
        const annual = annualEntries[0];
        let energy = suppliedEnergy ?? annual?.energyUse;
        const calculateMissingEnergy = isBlank(cells[column + 4]) && annual?.energyUse == null;
        const energyUnit = isBlank(cells[column + 5]) ? isBlank(annual?.energyUseUnit) ? ENERGY_USES_IMPORT_DEFAULTS.energyUnit : annual.energyUseUnit : isText(cells[column + 5]);
        if (!ENERGY_UNITS.includes(energyUnit)) { 
          error(`${sourceType}: energy unit is not supported.`); 
        }
        if (calculateMissingEnergy && !row.errors.length) {
          try {
            energy = calculateTotalEquipmentEnergyUse(operating, utility, energyUnit);
          } catch {
            error(`${sourceType}: energy use could not be calculated from the operating conditions and capacity units.`);
          }
        }
        if (energy !== undefined) {
          if (!Number.isFinite(energy) || energy < 0) { error(`${sourceType}: the energy total must be zero or greater.`); }
          if (!annual || annual.energyUse !== energy || annual.energyUseUnit !== energyUnit) {
            const overrideEnergyUse = !calculateMissingEnergy;
            change(`${sourceType} energy`, annual?.energyUse, energy);
            change(`${sourceType} energy unit`, annual?.energyUseUnit, energyUnit);
            if (annual) { Object.assign(annual, { energyUse: energy, energyUseUnit: energyUnit, overrideEnergyUse }); }
            else { utility.energyUse.push({ year, energyUse: energy, energyUseUnit: energyUnit, overrideEnergyUse }); }
          }
        }
        if (!current) { proposed.utilityData.push(utility); }
      }
      row.updatedEquipment = proposed;
      row.action = row.errors.length ? 'Error' : !existing ? 'Create' : JSON.stringify(existing) === JSON.stringify(proposed) ? 'Unchanged' : 'Update';
      return row;
    });
    const usedGroups = new Set(rows.filter(row => row.action === 'Create').map(row => row.updatedEquipment.energyUseGroupId));
    const created = rows.filter(row => row.action === 'Create').length;
    const updated = rows.filter(row => row.action === 'Update').length;
    const errorRows = rows.filter(row => row.action === 'Error').length;
    return {
      filename: workbookData.filename, accountGuid, revision, year, rows,
      newGroups: [...newGroups.values()].filter(group => usedGroups.has(group.guid)), created, updated,
      unchanged: rows.filter(row => row.action === 'Unchanged').length, errorRows,
      canImport: !errorRows && created + updated > 0
    };
  }

  async apply(preview: EnergyUsesImportPreview): Promise<void> {
    if (!preview.canImport || preview.errorRows || !preview.rows.length || preview.rows.some(row => !row.skipped && row.errors.length)) {
      throw new Error('Fix or skip every row with errors and review the changes before importing.');
    }
    await this.commandBoundary.execute({
      entityKind: 'energyUseEquipment', changeKind: 'bulk',
      entityGuid: preview.accountGuid, label: `Importing energy uses for ${preview.year}`
    }, async () => {
      this.assertCurrent(preview);
      return this.transactions.runTransaction(
        ['facilityEnergyUseGroups', 'facilityEnergyUseEquipment'],
        'readwrite', async transaction => {
          for (const group of preview.newGroups) {
            await transaction.add('facilityEnergyUseGroups', structuredClone(group));
          }
          for (const row of preview.rows) {
            if (row.skipped || row.action !== 'Create' && row.action !== 'Update') { 
              continue; 
            }
            const record = structuredClone(row.updatedEquipment);
            record.modifiedDate = new Date();
            if (row.action === 'Create') { 
              await transaction.add('facilityEnergyUseEquipment', record); 
            } else { 
              await transaction.put('facilityEnergyUseEquipment', record); 
            }
          }
        });
    });
  }

  private assertCurrent(preview: EnergyUsesImportPreview): void {
    if (this.workspace.account()?.guid !== preview.accountGuid || this.workspace.revision() !== preview.revision) {
      throw new WorkspaceWriteError('stale-workspace', 'The account or its data changed. Reopen Import to review it again.');
    }
  }

  private parseWorkbook(buffer: ArrayBuffer, filename: string): EnergyUsesWorkbook {
    if (!/\.xlsx$/i.test(filename)) {
      throw new Error('Choose an .xlsx workbook using the Energy Uses template.');
    }
    const book = XLSX.read(buffer, { type: 'array', cellFormula: true, cellDates: true });
    const sheet = book.Sheets[ENERGY_USES_SHEET];
    if (!sheet || !sheet['!ref']) {
      throw new Error('The workbook must contain an Energy Uses sheet.');
    }
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const workbookData: EnergyUsesWorkbook = { filename, year: this.findYear(filename), rows: [] };
    for (let row = 1; row <= range.e.r; row++) {
      const values: unknown[] = [];
      const errors: string[] = [];
      let populated = false;
      for (let column = 0; column < ENERGY_USES_HEADERS.length; column++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
        const value = cell?.v ?? null;
        populated ||= !!cell?.f || cell?.t === 'e' || value !== null && !(typeof value === 'string' && !value.trim());
        if (cell?.f || cell?.t === 'e' || cell?.t === 'b' || cell?.t === 'd') {
          errors.push(`${ENERGY_USES_HEADERS[column]} must contain an ordinary text or numeric value, not a formula, boolean, date, or Excel error.`);
        }
        values.push(value);
      }
      if (populated) {
        workbookData.rows.push({ importedRow: row + 1, values, errors });
      }
    }
    if (!workbookData.rows.length) {
      throw new Error('The Energy Uses sheet contains no equipment rows.');
    }
    return workbookData;
  }

  private findYear(filename: string): number | null {
    const stem = filename.replace(/\.[^.]*$/, '');
    const years = new Set([...stem.matchAll(/(?:^|[^\p{L}\p{N}])([1-9]\d{3})(?=$|[^\p{L}\p{N}])/gu)]
      .map(match => Number(match[1])));
    return years.size === 1 ? years.values().next().value : null;
  }
}

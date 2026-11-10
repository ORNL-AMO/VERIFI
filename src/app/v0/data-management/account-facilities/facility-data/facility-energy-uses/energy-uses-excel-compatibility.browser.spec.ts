import { TestBed } from '@angular/core/testing';
import * as ExcelJS from 'exceljs';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { ENERGY_USES_HEADERS, ENERGY_USES_SHEET } from './energy-uses-excel-format';
import { EnergyUsesExcelExportService } from './energy-uses-excel-export.service';
import { EnergyUsesExcelImportService } from './energy-uses-excel-import.service';

describe('Energy Uses legacy workbook round trip', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'capacity-account' };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'capacity-facility', name: 'Plant' };
  const group = { ...getNewIdbFacilityEnergyUseGroup(account.guid, facility.guid), id: 3, guid: 'capacity-group', name: 'Heating' };
  const items = ['kJh', 'GJh', 'MJh'].map((units, index) => ({
    ...getNewIdbFacilityEnergyUseEquipment(group, 2025), id: index + 4, guid: `capacity-${units}`, name: `Heater ${units}`,
    utilityData: [{ energySource: 'Natural Gas' as const, size: 100, units, numberOfEquipment: 1,
      energyUse: [{ year: 2024, energyUse: 5, energyUseUnit: 'kWh', overrideEnergyUse: true },
        { year: 2025, energyUse: (index + 1) * 10, energyUseUnit: 'kWh', overrideEnergyUse: true }] }]
  }));

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }
    ] });
    harness = await IndexedDbTestHarness.create('energy-use-capacity-workbooks');
    await harness.seed({ accounts: [account], facilities: [facility], facilityEnergyUseGroups: [group], facilityEnergyUseEquipment: items });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
  });

  afterEach(async () => { await harness.destroy(); });

  it('imports previous export codes, preserves saved identity/history, and reimports current display labels unchanged', async () => {
    const importer = TestBed.inject(EnergyUsesExcelImportService), exporter = TestBed.inject(EnergyUsesExcelExportService);
    const exported = exporter.prepareExportData(2025, new Set([facility.guid]));
    const legacy = exported.rows.map((row, index) => {
      const values = [...row];
      // The published exporter wrote these three codes before display labels were introduced.
      values[12] = items[index].utilityData[0].units;
      values[14] = Number(values[14]) + 1;
      return values;
    });
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet(ENERGY_USES_SHEET).addRows([ENERGY_USES_HEADERS, ...legacy]);
    const file = new File([await workbook.xlsx.writeBuffer()], 'VERIFI-Energy-Uses-2025.xlsx');
    const preview = importer.preparePreview(await importer.readFile(file), 2025);
    expect(preview.errorRows).toBe(0);
    expect(preview.rows.map(row => row.action)).toEqual(['Update', 'Update', 'Update']);
    expect(preview.newGroups).toEqual([]);
    await importer.apply(preview);

    const saved = TestBed.inject(AccountWorkspaceStore).energyUseEquipment();
    expect(saved).toHaveLength(3);
    for (const item of items) {
      const actual = saved.find(row => row.guid === item.guid)!;
      expect(actual).toMatchObject({ id: item.id, accountId: account.guid, facilityId: facility.guid, energyUseGroupId: group.guid });
      expect(actual.utilityData[0]).toEqual({ ...item.utilityData[0], energyUse: [item.utilityData[0].energyUse[0],
        { ...item.utilityData[0].energyUse[1], energyUse: item.utilityData[0].energyUse[1].energyUse + 1 }] });
    }

    const currentExport = exporter.prepareExportData(2025, new Set([facility.guid]));
    expect(currentExport.rows.map(row => row[12])).toEqual(['kJ/hr', 'GJ/hr', 'MJ/hr']);
    const currentWorkbook = new ExcelJS.Workbook();
    currentWorkbook.addWorksheet(ENERGY_USES_SHEET).addRow(ENERGY_USES_HEADERS);
    exporter.fillWorkbook(currentWorkbook, currentExport);
    const currentFile = new File([await currentWorkbook.xlsx.writeBuffer()], file.name);
    const roundTrip = importer.preparePreview(await importer.readFile(currentFile), 2025);
    expect(roundTrip.errorRows).toBe(0);
    expect(roundTrip.rows.map(row => row.action)).toEqual(['Unchanged', 'Unchanged', 'Unchanged']);
    expect(roundTrip.rows.every(row => !row.changes.length)).toBe(true);

    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(saved);
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([group]);
  });
});

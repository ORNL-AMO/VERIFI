import { TestBed } from '@angular/core/testing';
import * as XLSX from 'xlsx';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { SpreadsheetImportDraftService } from '../spreadsheet-import-draft.service';
import { SpreadsheetImportCommandService } from '../spreadsheet-import-command.service';
import { buildSpreadsheetImportCommitRequest } from '../spreadsheet-import-request.builder';
import { UploadDataFootprintToolService } from './upload-data-footprint-tool.service';

function footprintFile(): File {
  const workbook = XLSX.utils.book_new();
  const main = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(main, [[2026], [1]], { origin: 'K13' });
  XLSX.utils.book_append_sheet(workbook, main, 'Main');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), 'Energy Consumption');
  const uses = XLSX.utils.aoa_to_sheet([]);
  for (const [cell, value] of Object.entries({ D21: 'Production', C26: 'Compressor', F26: 'Electricity', G26: 100, H26: 'Kilowatts', BL26: 4000, BM26: .5, BN26: .8 })) {
    XLSX.utils.sheet_add_aoa(uses, [[value]], { origin: cell });
  }
  XLSX.utils.book_append_sheet(workbook, uses, 'Energy Uses');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), 'Relevant Variables');
  return new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], 'footprint.xlsx');
}

describe('Footprint existing-equipment import identities', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'footprint-account' };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'footprint-facility', name: 'Plant' };
  const group = { ...getNewIdbFacilityEnergyUseGroup(account.guid, facility.guid), id: 3, guid: 'saved-group', name: 'Production' };
  const item = { ...getNewIdbFacilityEnergyUseEquipment(group, 2026), id: 4, guid: 'saved-item', name: 'Compressor' };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('footprint-identities');
    await harness.seed({ accounts: [account], facilities: [facility], facilityEnergyUseGroups: [group], facilityEnergyUseEquipment: [item] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
  });
  afterEach(async () => { await harness.destroy(); });

  it('updates the same saved equipment on repeated real-file imports without adding duplicate groups or items', async () => {
    const drafts = TestBed.inject(SpreadsheetImportDraftService), commands = TestBed.inject(SpreadsheetImportCommandService);
    for (let index = 0; index < 2; index++) {
      const draft = await drafts.readFile(footprintFile());
      expect(draft.kind).toBe('footprint-tool');
      expect(draft.facilityEnergyUseGroups[0]).toMatchObject({ guid: group.guid, id: group.id, createdDate: group.createdDate });
      expect(draft.facilityEnergyUseEquipment[0]).toMatchObject({ guid: item.guid, id: item.id, createdDate: item.createdDate, energyUseGroupId: group.guid });
      const summary = await commands.commit(buildSpreadsheetImportCommitRequest(draft, account.guid));
      expect(summary.updated.energyUseEquipment).toBe(1); expect(summary.added.energyUseEquipment).toBe(0);
      expect(summary.updated.energyUseGroups).toBe(1); expect(summary.added.energyUseGroups).toBe(0);
      const saved = await harness.getAll<IdbFacilityEnergyUseEquipment & { [key: string]: unknown }>('facilityEnergyUseEquipment');
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ guid: item.guid, id: item.id, facilityId: facility.guid, energyUseGroupId: group.guid, createdDate: item.createdDate });
      expect(saved[0].utilityData[0].energyUse[0].energyUse).toBeGreaterThan(0);
      expect(await harness.getAll('facilityEnergyUseGroups')).toHaveLength(1);
    }
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toHaveLength(1);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([expect.objectContaining({ guid: item.guid, id: item.id })]);
  });

  it('restores parsed identities for unmatched facilities and rematches saved identities when switching back', async () => {
    const other = { ...facility, id: 5, guid: 'other-facility', name: 'Other' };
    await harness.seed({ facilities: [other] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace();
    const draft = await TestBed.inject(SpreadsheetImportDraftService).readFile(footprintFile());
    const parsedGroupGuid = draft.facilityEnergyUseGroups[0].guid, parsedItemGuid = draft.facilityEnergyUseEquipment[0].guid;
    const parser = TestBed.inject(UploadDataFootprintToolService);
    draft.selectedFacilityId = facility.guid; parser.setSelectedFacility(draft);
    expect(draft.facilityEnergyUseEquipment[0]).toMatchObject({ guid: item.guid, id: item.id });
    draft.selectedFacilityId = other.guid; parser.setSelectedFacility(draft);
    expect(draft.facilityEnergyUseGroups[0]).toMatchObject({ guid: parsedGroupGuid, facilityId: other.guid });
    expect(draft.facilityEnergyUseGroups[0].id).toBeUndefined();
    expect(draft.facilityEnergyUseEquipment[0]).toMatchObject({ guid: parsedItemGuid, facilityId: other.guid, energyUseGroupId: parsedGroupGuid });
    expect(draft.facilityEnergyUseEquipment[0].id).toBeUndefined();
    draft.selectedFacilityId = facility.guid; parser.setSelectedFacility(draft);
    expect(draft.facilityEnergyUseEquipment[0]).toMatchObject({ guid: item.guid, id: item.id, energyUseGroupId: group.guid });
    const store = TestBed.inject(AccountWorkspaceStore);
    expect(store.energyUseEquipment()).toEqual([item]);
  });
});

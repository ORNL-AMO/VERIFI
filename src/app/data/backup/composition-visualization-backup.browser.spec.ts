import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIndexedDb } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { compositionFixture } from '@domain/visualizations/testing/composition-fixtures';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { PreviewComponent } from '@app/v1/visualizations/preview/preview/preview.component';
import { VisualizationsModule } from '@app/v1/visualizations/visualizations.module';
import { BackupImportCommandService } from './backup-import-command.service';
import { BackupPreparationService } from './backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';

describe('composition backup compatibility', () => {
  let harness: IndexedDbTestHarness | undefined, fixture: ComponentFixture<PreviewComponent> | undefined;
  afterEach(async () => { fixture?.destroy(); fixture = undefined; await harness?.destroy(); harness = undefined; TestBed.resetTestingModule(); });
  it.each(['Account', 'Facility'] as const)('restores %s sunburst hierarchy and item styling through actual GUID remapping and storage', async kind => {
    harness = await IndexedDbTestHarness.create('vis8-backup');
    const { snapshot, definition } = compositionFixture({ kind: 'sunburst', hierarchy: ['group', 'equipment'], values: 'percent' });
    const original = { ...snapshot, savedVisualizations: [{ ...getNewIdbSavedVisualization({ ...definition,
      series: definition.series.map(series => ({ ...series, overrides: [{ resourceGuid: 'small', label: 'Tiny saved contribution', color: '#23684d', order: 0 }] })) }), guid: 'sunburst' }] };
    const builder = new WorkspaceBackupSnapshotBuilder(), preparation = new BackupPreparationService();
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account' ? builder.buildAccountBackup(original) : builder.buildFacilityBackup(original, 'facility-a'))));
    const importer = new BackupImportCommandService(new IndexedDbTransactionService(indexedDB, { [dbConfig.name]: { ...dbConfig, name: harness.databaseName } }),
      { setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn() } as unknown as LoadingService);
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await importer.importAccountBackupFile(backup, 0)).guid;
    else { accountGuid = 'destination'; await harness.seed({ accounts: [{ ...snapshot.account, guid: accountGuid }] }); await importer.importFacilityBackupFile(backup, accountGuid, 0); }
    await harness.reopen(); TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [provideRouter([]), provideIndexedDb({ ...dbConfig, name: harness.databaseName }),
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(accountGuid);
    const store = TestBed.inject(AccountWorkspaceStore), restored = store.snapshot()!, record = restored.savedVisualizations[0], decoded = readSavedVisualization(record);
    if (decoded.state !== 'valid') throw new Error(JSON.stringify(decoded));
    const tiny = restored.energyUseEquipment.find(item => item.name === 'Small positive share')!;
    expect(tiny.guid).not.toBe('small'); expect(decoded.definition.chart).toEqual(definition.chart);
    expect(decoded.definition.series[0].overrides?.[0]).toMatchObject({ resourceGuid: tiny.guid, label: 'Tiny saved contribution', color: '#23684d', order: 0 });
    const before = await harness.getAll('facilityEnergyUseEquipment');
    fixture = TestBed.createComponent(PreviewComponent); fixture.componentRef.setInput('definition', decoded.definition);
    fixture.componentRef.setInput('identity', { accountGuid, workspaceRevision: store.revision(), definitionGuid: record.guid, definitionRevision: record.revision }); fixture.detectChanges();
    await vi.waitFor(() => { fixture!.detectChanges(); const state = fixture!.componentInstance.preview.state(); expect(state.state, JSON.stringify(state)).toBe('ready'); });
    expect(fixture.nativeElement.textContent).toContain('Tiny saved contribution');
    const roundTrip = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(restored))));
    expect(roundTrip.savedVisualizations[0].definition).toEqual(record.definition);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(before);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import type { VisualizationChart } from '@domain/visualizations/visualization-definition';
import type { ExplorationModel } from '@domain/visualizations/visualization-exploration';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { PreviewComponent } from '@app/v1/visualizations/preview/preview/preview.component';
import { VisualizationsModule } from '@app/v1/visualizations/visualizations.module';
import { UtilityDataSession } from '@app/v1/visualizations/utility/utility-data-session.service';
import { BackupImportCommandService } from './backup-import-command.service';
import { BackupPreparationService } from './backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { predictorVisualizationBackupSnapshot } from './predictor-visualization-backup.testing';

describe('exploration backup and monthly heatmap acceptance', () => {
  let harness: IndexedDbTestHarness | undefined, fixture: ComponentFixture<PreviewComponent> | undefined;
  afterEach(async () => { fixture?.destroy(); fixture = undefined; vi.restoreAllMocks(); await harness?.destroy(); harness = undefined; TestBed.resetTestingModule(); });
  it.each(['Account', 'Facility'] as const)('restores %s scatter selectors, pair/matrix settings and both heatmap layouts through actual backup storage', async kind => {
    harness = await IndexedDbTestHarness.create('vis7-backup');
    const original = predictorVisualizationBackupSnapshot(), fixed = original.savedVisualizations[0].definition as import('@domain/visualizations/visualization-definition').VisualizationDefinition;
    const sourceId = fixed.sources[0].id;
    const charts: VisualizationChart[] = [
      { kind: 'scatter', showFit: true, interval: 'monthly', grouping: 'month', scale: 'raw', x: { sourceId, resourceGuid: 'predictor-a' }, y: { sourceId, resourceGuid: 'weather-a' } },
      { kind: 'correlation', statistic: 'r', scale: 'raw', view: 'pairs', grouping: 'year', showFit: false },
      { kind: 'correlation', statistic: 'r-squared', scale: 'z-score', view: 'matrix', showFit: true },
      { kind: 'heatmap', dimension: 'month-year', scale: 'linear' },
      { kind: 'heatmap', dimension: 'series-period', scale: 'diverging', normalization: 'z-score' }
    ];
    original.savedVisualizations = charts.map((chart, index) => ({ ...getNewIdbSavedVisualization({ ...fixed, name: `VIS7 ${index}`, chart }), guid: `vis7-${index}` }));
    const builder = new WorkspaceBackupSnapshotBuilder(), preparation = new BackupPreparationService();
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account' ? builder.buildAccountBackup(original) : builder.buildFacilityBackup(original, 'facility-a'))));
    const importer = new BackupImportCommandService(new IndexedDbTransactionService(indexedDB, { [dbConfig.name]: { ...dbConfig, name: harness.databaseName } }),
      { setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn() } as unknown as LoadingService);
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await importer.importAccountBackupFile(backup, 0)).guid;
    else { accountGuid = 'destination'; await harness.seed({ accounts: [{ ...original.account, guid: accountGuid }] }); await importer.importFacilityBackupFile(backup, accountGuid, 0); }
    await harness.reopen(); TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [provideIndexedDb({ ...dbConfig, name: harness.databaseName }), { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(accountGuid);
    const store = TestBed.inject(AccountWorkspaceStore), restored = store.snapshot()!, before = await harness.getAll('predictorData');
    const demand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    const production = restored.predictors.find(item => item.name === 'Production')!, weather = restored.predictors.find(item => item.name === 'CDD')!;
    expect(production.guid).not.toBe('predictor-a'); expect(weather.guid).not.toBe('weather-a');
    const roundTrip = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(restored))));
    expect(roundTrip.savedVisualizations.map(item => item.definition)).toEqual(restored.savedVisualizations.map(item => item.definition));
    for (const record of restored.savedVisualizations) {
      const decoded = readSavedVisualization(record); if (decoded.state !== 'valid') throw new Error(JSON.stringify(decoded));
      if (decoded.definition.chart?.kind === 'scatter') expect(decoded.definition.chart).toMatchObject({ x: { resourceGuid: production.guid }, y: { resourceGuid: weather.guid }, grouping: 'month', showFit: true });
      fixture?.destroy(); fixture = TestBed.createComponent(PreviewComponent);
      fixture.componentRef.setInput('definition', decoded.definition);
      fixture.componentRef.setInput('identity', { accountGuid, workspaceRevision: store.revision(), definitionGuid: record.guid, definitionRevision: record.revision });
      const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%'; fixture.detectChanges();
      await vi.waitFor(() => { fixture!.detectChanges(); expect(fixture!.componentInstance.preview.state().state).toBe('ready'); });
      const state = fixture.componentInstance.preview.state(); if (state.state !== 'ready') throw new Error('Ready exploration expected');
      const model = state.presentation.inputs['model'] as ExplorationModel;
      expect(model.series).toHaveLength(2);
      if (model.chart.kind !== 'heatmap') { expect(model.pairs[0].count).toBe(2); expect(model.pairs[0].statistics.unavailableReason).toContain('three'); }
      if (model.chart.kind === 'heatmap' && model.chart.dimension === 'month-year') {
        expect(root.querySelectorAll('.heatmap-panel')).toHaveLength(2);
        expect(root.querySelector('table, .inspection')).toBeNull();
        expect(state.presentation.details.rows.some(row => row.join(' ').includes('Duplicate'))).toBe(true);
      }
    }
    expect(await harness.getAll('predictorData')).toEqual(before); expect(demand).not.toHaveBeenCalled();
  });
});

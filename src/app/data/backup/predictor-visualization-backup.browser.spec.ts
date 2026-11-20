import { previewValuesText } from '@app/v1/visualizations/testing/preview-values.testing';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { cdp, page } from 'vitest/browser';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { calendarizedMeter, monthlyData } from '@app/v1/data/meters/facility-meters.testing';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { projectWorkspaceCalendarization } from '@app/v1/shared/calendarization/workspace-calendarization-projection';
import type { WorkspaceCalendarizationBaseResult, WorkspaceCalendarizationProjectionRequest } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { echarts } from '@app/v1/shared/charts/echarts';
import { VisualizationsModule } from '@app/v1/visualizations/visualizations.module';
import { PreviewComponent } from '@app/v1/visualizations/preview/preview/preview.component';
import { HourlyWeatherDataService } from '@platform/weather/hourly-weather-data.service';
import { BackupImportCommandService } from './backup-import-command.service';
import { BackupPreparationService } from './backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { predictorVisualizationBackupSnapshot } from './predictor-visualization-backup.testing';

describe('populated predictor visualization backup acceptance', () => {
  let harness: IndexedDbTestHarness;
  let fixture: ComponentFixture<PreviewComponent> | undefined;
  const builder = new WorkspaceBackupSnapshotBuilder(), preparation = new BackupPreparationService();
  beforeEach(async () => { harness = await IndexedDbTestHarness.create('predictor-visualization-backup'); });
  afterEach(async () => { fixture?.destroy(); fixture = undefined; TestBed.resetTestingModule(); await harness?.destroy(); vi.restoreAllMocks(); });

  it.each(['Account', 'Facility'] as const)('restores %s fixed, All and mixed charts with values, provenance and GUID-bound appearance, then previews and prints them', async kind => {
    const original = predictorVisualizationBackupSnapshot();
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account' ? builder.buildAccountBackup(original) : builder.buildFacilityBackup(original, 'facility-a'))));
    const before = structuredClone(backup);
    const service = new BackupImportCommandService(new IndexedDbTransactionService(indexedDB, { [dbConfig.name]: { ...dbConfig, name: harness.databaseName } }),
      { setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn() } as unknown as LoadingService);
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await service.importAccountBackupFile(backup, 0)).guid;
    else {
      accountGuid = 'destination';
      await harness.seed({ accounts: [{ ...original.account, guid: accountGuid }], facilities: [{ ...original.facilities[0], guid: 'outside', accountId: accountGuid }],
        predictor: [{ ...original.predictors[0], guid: 'predictor-a', accountId: accountGuid, facilityId: 'outside', name: 'Same name collision' }] });
      await service.importFacilityBackupFile(backup, accountGuid, 0);
    }
    await harness.reopen();
    const byOwner = async (store: string) => (await harness.getAll<any>(store)).filter(item => item.accountId === accountGuid);
    const restored: AccountWorkspaceSnapshot = { ...original, account: (await harness.getAll<any>('accounts')).find(item => item.guid === accountGuid),
      facilities: await byOwner('facilities'), meters: await byOwner('utilityMeter'), meterGroups: await byOwner('utilityMeterGroups'), meterData: await byOwner('utilityMeterData'),
      predictors: await byOwner('predictor'), predictorData: await byOwner('predictorData'), savedVisualizations: await byOwner('savedVisualizations'),
      facilityAnalyses: await byOwner('analysisItems'), accountAnalyses: [], accountReports: [], facilityReports: [], energyUseGroups: [], energyUseEquipment: [], customEmissions: [], customFuels: [], customGWPs: [] };
    expect(restored.savedVisualizations).toHaveLength(3);
    const standard = restored.predictors.find(predictor => predictor.name === 'Production')!, weather = restored.predictors.find(predictor => predictor.name === 'CDD')!;
    expect(standard.guid).not.toBe('predictor-a'); expect(weather.guid).not.toBe('weather-a');
    expect(restored.predictorData.filter(reading => reading.predictorId === standard.guid).map(reading => reading.amount)).toEqual([0, 12]);
    expect(restored.predictorData.find(reading => reading.predictorId === weather.guid && reading.month === 1)).toMatchObject({ amount: -4, weatherOverride: true, weatherDataChanged: true, weatherDataWarning: true });
    expect(weather).toMatchObject({ unit: 'days', weatherStationId: 'saved-station', coolingBaseTemperature: 65 });
    const exported = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(restored))));
    expect(exported.savedVisualizations.map(record => record.definition)).toEqual(restored.savedVisualizations.map(record => record.definition));
    expect(backup).toEqual(before);
    const secondAccount = await service.importAccountBackupFile(exported, 0);
    const secondWeather = (await harness.getAll<any>('predictor')).find(item => item.accountId === secondAccount.guid && item.name === 'CDD');
    const secondChart = (await harness.getAll<any>('savedVisualizations')).find(item => item.accountId === secondAccount.guid && item.definition.name === 'All predictors');
    expect(secondChart.definition.series[0].overrides[0]).toMatchObject({ seriesId: `predictors:history:predictor:${secondWeather.guid}`, accountGuid: secondAccount.guid, label: 'Saved cooling' });
    expect(secondChart.definition.series[0].overrides[2]).toMatchObject({ accountGuid: original.account.guid, visible: false });

    // A new renderer consumes the reopened committed records, without a source-writing service.
    TestBed.resetTestingModule();
    const store = new AccountWorkspaceStore(); store.publish(restored);
    const base: WorkspaceCalendarizationBaseResult = { state: 'ready', accountGuid, inputFingerprint: 'restored', meters: restored.meters.map(meter =>
      calendarizedMeter(meter, [monthlyData({ year: 2026, monthNumValue: 0, energyUse: 10, energyConsumption: 10, energyCost: 20 })], { energyUnit: 'kWh', consumptionUnit: 'kWh' })) };
    const getWeather = vi.fn(() => { throw new Error('Restore previews must not retrieve weather'); });
    const canonical = vi.fn(() => of(base));
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: HourlyWeatherDataService, useValue: { load: getWeather } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: canonical, currentInputFingerprint: () => 'restored', currentEmissionsRates: () => [],
        project: (evidence: WorkspaceCalendarizationBaseResult, request: WorkspaceCalendarizationProjectionRequest) => projectWorkspaceCalendarization(evidence, restored, request) } }
    ] });
    const sourcesBefore = structuredClone({ predictors: restored.predictors, readings: restored.predictorData });
    const media = cdp() as { send(method: string, params: { media: string }): Promise<void> };
    try {
      for (const record of restored.savedVisualizations) {
        const decoded = readSavedVisualization(record); if (decoded.state !== 'valid') throw new Error('Expected valid restored chart');
        expect(decoded.definition.facilitySelection.kind).toBe(kind === 'Account' ? 'all' : 'fixed');
        const predictorSource = decoded.definition.sources.find(source => source.kind === 'predictor')!;
        expect(predictorSource.selection?.kind).toBe(decoded.definition.name === 'Fixed predictors' ? 'fixed' : 'rule');
        const appearance = decoded.definition.series.find(series => series.sourceId === predictorSource.id)!.overrides!;
        expect(appearance[0]).toMatchObject({ seriesId: `${predictorSource.id}:predictor:${weather.guid}`, accountGuid, label: 'Saved cooling', axis: 'right', traceType: 'bar', color: '#23684d', lineStyle: 'dashed', order: 0 });
        expect(appearance[2]).toMatchObject({ accountGuid: original.account.guid, visible: false });
        fixture?.destroy(); fixture = TestBed.createComponent(PreviewComponent);
        fixture.componentRef.setInput('definition', decoded.definition);
        fixture.componentRef.setInput('identity', { accountGuid, definitionGuid: record.guid, definitionRevision: record.revision, workspaceRevision: store.revision() });
        const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%'; fixture.detectChanges();
        await vi.waitFor(() => { fixture!.detectChanges(); expect(root.querySelector('canvas')).not.toBeNull(); });
        const values = previewValuesText(fixture!);
        expect(values).toContain('0 widgets'); expect(values).toContain('Manual weather override'); expect(values).toContain('Saved station');
        expect(values).toContain('Duplicate readings'); expect(values).not.toContain('Same name collision');
        for (const duplicate of restored.predictorData.filter(reading => reading.predictorId === weather.guid && reading.month === 2))
          expect(values).toContain(`${duplicate.guid}: ${duplicate.amount}`);
        const chart = echarts.getInstanceByDom(root.querySelector<HTMLElement>('.time-series-canvas')!)!;
        expect((chart.getOption() as any).series.find((series: any) => series.name === 'Saved cooling')).toMatchObject({ type: 'bar', yAxisIndex: 1 });
        if (decoded.definition.name === 'All predictors') {
          for (const [width, theme] of [[1100, ''], [390, 'v1-theme-dark']] as const) {
            await page.viewport(width, 850); root.className = `v1-root ${theme}`; fixture.detectChanges();
            await vi.waitFor(() => expect(chart.getWidth()).toBeLessThanOrEqual(width));
            expect(root.scrollWidth).toBeLessThanOrEqual(width);
          }
          await page.viewport(1100, 850); root.className = 'v1-root';
          await media.send('Emulation.setEmulatedMedia', { media: 'print' }); fixture.detectChanges();
          expect(root.querySelector('.time-series-actions, table')).toBeNull();
          await vi.waitFor(() => expect(chart.getHeight()).toBe(Math.round(root.querySelector<HTMLElement>('.time-series-canvas')!.getBoundingClientRect().height)));
          expect(previewValuesText(fixture!)).toBe(values);
          await media.send('Emulation.setEmulatedMedia', { media: '' });
        }
      }
      expect(canonical).toHaveBeenCalledOnce(); expect(getWeather).not.toHaveBeenCalled();
      expect({ predictors: restored.predictors, readings: restored.predictorData }).toEqual(sourcesBefore);
      expect(await byOwner('predictorData')).toEqual(sourcesBefore.readings);
    } finally { await media.send('Emulation.setEmulatedMedia', { media: '' }); }
  });
});

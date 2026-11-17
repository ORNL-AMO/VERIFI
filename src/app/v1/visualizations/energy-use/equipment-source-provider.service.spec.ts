import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { equipmentDefinition, equipmentSnapshot } from '@domain/visualizations/testing/equipment-fixtures';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { EquipmentSourceProvider } from './equipment-source-provider.service';
import { VisualizationDateContextResolver } from '../preview/visualization-date-context.service';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { UtilitySourceProvider } from '../utility/utility-source-provider.service';

describe('equipment preview snapshot boundary', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('reads only current equipment snapshots and rejects loading, obsolete, foreign and canceled requests without meter demand', async () => {
    const store = new AccountWorkspaceStore(); store.publish(equipmentSnapshot());
    const acquire = vi.fn(), meterResolve = vi.fn();
    TestBed.configureTestingModule({ providers: [EquipmentSourceProvider, VisualizationDateContextResolver,
      { provide: AccountWorkspaceStore, useValue: store }, { provide: UtilityDataSession, useValue: { acquire } },
      { provide: UtilitySourceProvider, useValue: { resolve: meterResolve } }] });
    const definition = equipmentDefinition(), identity = { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: 'saved', definitionRevision: 1 };
    const abort = new AbortController();
    await TestBed.inject(VisualizationDateContextResolver).resolve(definition, identity, abort.signal);
    const request = { identity: { ...identity, requestId: 'test', sourceId: 'source-1', scope: resolveVisualizationFacilities(definition, store.facilities()).scope }, source: definition.sources[0], chart: definition.chart!,
      period: definition.period, comparison: definition.comparison, series: definition.series, dateContext: { calendarDate: '2026-11-16' } };
    const provider = TestBed.inject(EquipmentSourceProvider);
    expect((await provider.resolve(request, abort.signal)).state).toBe('ready');
    expect(acquire).not.toHaveBeenCalled(); expect(meterResolve).not.toHaveBeenCalled();
    store.beginLoad(true); expect((await provider.resolve(request, abort.signal)).state).toBe('error');
    store.publish(equipmentSnapshot()); abort.abort(); expect((await provider.resolve(request, abort.signal)).state).toBe('error');
    store.publishCommitted(equipmentSnapshot(), {}); expect((await provider.resolve(request, new AbortController().signal)).state).toBe('error');
    store.publish({ ...equipmentSnapshot(), account: { ...equipmentSnapshot().account, guid: 'other-account' } });
    expect((await provider.resolve(request, new AbortController().signal)).state).toBe('error');
  });
});

import { getNewIdbSavedVisualization } from '../models/idbModels/savedVisualization';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { createCaptureOrigin, unchangedCaptureSource } from './visualization-capture-origin';
import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { transferSavedVisualization } from '../backup/visualization-backup';
import { readSavedVisualization } from './saved-visualization-record';

describe('conditional captured chart source', () => {
  const source = { kind: 'meter-monthly' as const, facilityGuid: 'facility-a', meterGuid: 'meter-a' };
  function setup() {
    const definition = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] }), record = getNewIdbSavedVisualization(definition);
    record.captureOrigin = createCaptureOrigin(source, definition);
    return { definition, record, snapshot: { ...visualizationSnapshot(), meters: [meter({})] } };
  }
  it('survives serialization and rename but hides for every changed chart setting and restores on reversion', () => {
    const { definition, record, snapshot } = setup();
    expect(unchangedCaptureSource(JSON.parse(JSON.stringify(record)), { ...definition, name: 'Another name' }, snapshot)).toEqual(source);
    for (const changed of [
      { ...definition, appearance: { ...definition.appearance, title: 'Changed' } },
      { ...definition, appearance: { legend: false } },
      { ...definition, period: { kind: 'fixed' as const, basis: 'calendar' as const, start: '2026-01-01', end: '2026-12-31' } },
      { ...definition, series: definition.series.map(series => ({ ...series, visible: false })) },
      { ...definition, displaySettings: { units: { energy: { kind: 'pinned' as const, value: 'MMBtu' } } } },
      { ...definition, chart: { kind: 'time-series' as const, interval: 'monthly' as const, defaultTraceType: 'bar' as const, stack: 'none' as const } }
    ]) expect(unchangedCaptureSource(record, changed, snapshot)).toBeUndefined();
    expect(unchangedCaptureSource(record, definition, snapshot)).toEqual(source);
    expect(unchangedCaptureSource(record, definition, { ...snapshot, meterData: [] })).toEqual(source);
  });
  it('requires verifiable provenance and current ownership without invalidating an ordinary chart', () => {
    const { definition, record, snapshot } = setup();
    expect(unchangedCaptureSource({ ...record, captureOrigin: undefined }, definition, snapshot)).toBeUndefined();
    expect(unchangedCaptureSource(record, definition, { ...snapshot, meters: [] })).toBeUndefined();
    expect(unchangedCaptureSource(record, definition, { ...snapshot, meters: [meter({ accountId: 'foreign' })] })).toBeUndefined();
    const malformed = { ...record, captureOrigin: { ...record.captureOrigin!, baseline: { unexpected: true } } };
    expect(unchangedCaptureSource(malformed, definition, snapshot)).toBeUndefined();
    expect(readSavedVisualization(malformed).state).toBe('valid');
  });
  it('remaps the origin and original baseline, retaining the comparison rather than granting edited copies a new baseline', () => {
    const { definition, record, snapshot } = setup();
    const copied = transferSavedVisualization(record, 'account-b', { facility: { 'facility-a': 'facility-b' }, meter: { 'meter-a': 'meter-b' } }, 'copy');
    const decoded = readSavedVisualization(copied); if (decoded.state !== 'valid') throw new Error('Expected readable copy');
    const target = { ...snapshot, account: { ...snapshot.account, guid: 'account-b' }, facilities: snapshot.facilities.map(item => ({ ...item, guid: 'facility-b', accountId: 'account-b' })), meters: [meter({ guid: 'meter-b', facilityId: 'facility-b', accountId: 'account-b' })] };
    expect(unchangedCaptureSource(copied, decoded.definition, target)).toEqual({ ...source, facilityGuid: 'facility-b', meterGuid: 'meter-b' });
    expect(unchangedCaptureSource(copied, { ...decoded.definition, appearance: { legend: false } }, target)).toBeUndefined();
    const partial = transferSavedVisualization(record, 'account-b', { facility: { 'facility-a': 'facility-b' } }, 'partial');
    expect(partial.captureOrigin?.unresolved).toBe(true);
    expect(unchangedCaptureSource(partial, definition, snapshot)).toBeUndefined();
  });
});

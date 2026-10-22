import { account, facility, group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { orderPortfolioMeters } from './portfolio-tile.views';
import { buildPortfolioMeters, filterPortfolioMeters, PortfolioMeterInput } from './portfolio-meter.view';

function input(): PortfolioMeterInput {
  return {
    facilities: [facility({ guid: 'a', name: 'Alpha Plant' }), facility({ guid: 'b', name: 'Beta Works' }), facility({ guid: 'empty' })],
    meters: [
      meter({ guid: 'a-warning', name: 'Main', facilityId: 'a', groupId: 'ga' }),
      meter({ guid: 'a-healthy', name: 'Line', facilityId: 'a', groupId: 'ga', source: 'Water Intake' }),
      meter({ guid: 'b-error', name: 'Main', facilityId: 'b', groupId: 'gb' }),
      meter({ guid: 'b-empty', name: 'New', facilityId: 'b', groupId: 'gb' }),
      meter({ guid: 'b-ungrouped', name: 'Other', facilityId: 'b' })
    ],
    readings: [
      reading({ meterId: 'a-warning', facilityId: 'a', month: 1 }),
      reading({ meterId: 'a-healthy', facilityId: 'a', month: 2 }),
      reading({ meterId: 'b-error', facilityId: 'b', year: 2025, month: 12 }),
      reading({ meterId: 'b-ungrouped', facilityId: 'b', month: 4 })
    ],
    groups: [group({ guid: 'ga', facilityId: 'a', name: 'Production' }), group({ guid: 'gb', facilityId: 'b', name: 'Utilities' })],
    findings: presentFindings([
      makeFinding('meter.currency.stale', 'warning', 'currency', { kind: 'meter', guid: 'a-warning', name: 'Main', accountGuid: account().guid, facilityGuid: 'a' }),
      makeFinding('meter.configuration.invalid', 'error', 'configuration', { kind: 'meter', guid: 'b-error', name: 'Main', accountGuid: account().guid, facilityGuid: 'b' }),
      makeFinding('meter.data.missing', 'warning', 'completeness', { kind: 'meter', guid: 'b-empty', name: 'New', accountGuid: account().guid, facilityGuid: 'b' })
    ]),
    statusState: 'ready'
  };
}

describe('portfolio meter tile projections', () => {
  it('orders individual meters globally by existing attention priority', () => {
    const board = orderPortfolioMeters(buildPortfolioMeters(input()), 'attention');
    expect(board.map(item => item.meter.guid)).toEqual(['b-error', 'b-empty', 'a-warning', 'b-ungrouped', 'a-healthy']);
    expect(board[0].statusLabel).toBe('Has errors');
    expect(board[2].statusLabel).toBe('Has warnings');
    expect(board[4].statusLabel).toBe('All data valid');
  });
  it('sorts by facility/name or newest reading across all facilities', () => {
    const meters = buildPortfolioMeters(input());
    expect(orderPortfolioMeters(meters, 'facilityName').map(item => item.meter.guid)).toEqual(['a-healthy', 'a-warning', 'b-error', 'b-empty', 'b-ungrouped']);
    expect(orderPortfolioMeters(meters, 'latestReading').map(item => item.meter.guid)).toEqual(['b-ungrouped', 'a-healthy', 'a-warning', 'b-error', 'b-empty']);
  });

  it('combines search and status filters before applying global ordering', () => {
    const meters = buildPortfolioMeters(input());
    for (const query of ['main', 'ALPHA PLANT', 'water intake', 'production', 'has warnings', 'needs review', 'ungrouped']) {
      expect(filterPortfolioMeters(meters, query, 'all').length).toBeGreaterThan(0);
    }
    expect(filterPortfolioMeters(meters, 'beta', 'noReadings').map(item => item.meter.guid)).toEqual(['b-empty']);
    expect(filterPortfolioMeters(meters, 'beta', 'missingGroup').map(item => item.meter.guid)).toEqual(['b-ungrouped']);
    expect(filterPortfolioMeters(meters, 'alpha', 'valid').map(item => item.meter.guid)).toEqual(['a-healthy']);
    expect(filterPortfolioMeters(meters, 'water', 'attention')).toEqual([]);
    const visible = orderPortfolioMeters(filterPortfolioMeters(meters, 'line', 'all'), 'attention');
    expect(visible).toHaveLength(1);
    expect(visible[0].facility.guid).toBe('a');
    expect(visible[0].attentionRank).toBe(5);
    expect(orderPortfolioMeters(filterPortfolioMeters(meters, 'absent', 'all'), 'attention')).toEqual([]);
  });

  it.each(['idle', 'evaluating', 'error'] as const)('keeps %s checks neutral and excludes them from Valid', statusState => {
    const meters = buildPortfolioMeters({ ...input(), statusState });
    expect(meters.every(item => item.statusTone === 'neutral')).toBe(true);
    expect(meters.every(item => item.statusLabel === (statusState === 'error' ? 'Checks unavailable' : 'Checks pending'))).toBe(true);
    expect(filterPortfolioMeters(meters, '', 'valid')).toEqual([]);
    expect(filterPortfolioMeters(meters, '', 'noReadings').map(item => item.meter.guid)).toEqual(['b-empty']);
  });

  it('uses GUIDs to separate duplicate names and stabilize ties', () => {
    const meters = buildPortfolioMeters({ facilities: [facility({ guid: 'b', name: 'Plant' }), facility({ guid: 'a', name: 'Plant' })],
      meters: [meter({ guid: 'z', name: 'Main', facilityId: 'a' }), meter({ guid: 'a', name: 'Main', facilityId: 'a' }), meter({ guid: 'b', name: 'Main', facilityId: 'b' })],
      readings: [], groups: [], findings: [], statusState: 'ready' });
    for (const sort of ['attention', 'facilityName', 'latestReading'] as const) {
      const board = orderPortfolioMeters(meters, sort);
      expect(board.map(item => item.meter.guid)).toEqual(['a', 'z', 'b']);
    }
  });
});

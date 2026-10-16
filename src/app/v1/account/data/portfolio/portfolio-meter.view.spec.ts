import { account, facility, group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { buildPortfolioMeters, filterPortfolioMeters, groupPortfolioMeters, PortfolioMeterInput } from './portfolio-meter.view';

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

describe('portfolio meter board projections', () => {
  it('groups by facility GUID and orders groups and meters using the existing attention priority', () => {
    const board = groupPortfolioMeters(buildPortfolioMeters(input()), 'attention');
    expect(board.map(item => item.facility.guid)).toEqual(['b', 'a']);
    expect(board[0].meters.map(item => item.meter.guid)).toEqual(['b-error', 'b-empty', 'b-ungrouped']);
    expect(board[1].meters.map(item => item.meter.guid)).toEqual(['a-warning', 'a-healthy']);
    expect(board[0].meters[0].statusLabel).toBe('Has errors');
    expect(board[1].meters.map(item => item.statusLabel)).toEqual(['Has warnings', 'No active findings']);
    expect(board.flatMap(item => item.meters)).toHaveLength(5);
  });

  it('sorts alphabetically within facilities or by newest reading at both levels', () => {
    const meters = buildPortfolioMeters(input());
    const alphabetical = groupPortfolioMeters(meters, 'facilityName');
    expect(alphabetical.map(item => item.facility.guid)).toEqual(['a', 'b']);
    expect(alphabetical[0].meters.map(item => item.meter.name)).toEqual(['Line', 'Main']);
    const recent = groupPortfolioMeters(meters, 'latestReading');
    expect(recent.map(item => item.facility.guid)).toEqual(['b', 'a']);
    expect(recent[0].meters.map(item => item.meter.guid)).toEqual(['b-ungrouped', 'b-error', 'b-empty']);
    expect(recent[1].meters.map(item => item.meter.guid)).toEqual(['a-healthy', 'a-warning']);
  });

  it('combines search and status filters before calculating visible group priority', () => {
    const meters = buildPortfolioMeters(input());
    for (const query of ['main', 'ALPHA PLANT', 'water intake', 'production', 'has warnings', 'needs review', 'ungrouped']) {
      expect(filterPortfolioMeters(meters, query, 'all').length).toBeGreaterThan(0);
    }
    expect(filterPortfolioMeters(meters, 'beta', 'noReadings').map(item => item.meter.guid)).toEqual(['b-empty']);
    expect(filterPortfolioMeters(meters, 'beta', 'missingGroup').map(item => item.meter.guid)).toEqual(['b-ungrouped']);
    expect(filterPortfolioMeters(meters, 'alpha', 'valid').map(item => item.meter.guid)).toEqual(['a-healthy']);
    expect(filterPortfolioMeters(meters, 'water', 'attention')).toEqual([]);
    const visible = groupPortfolioMeters(filterPortfolioMeters(meters, 'line', 'all'), 'attention');
    expect(visible).toHaveLength(1);
    expect(visible[0].facility.guid).toBe('a');
    expect(visible[0].attentionRank).toBe(5);
    expect(groupPortfolioMeters(filterPortfolioMeters(meters, 'absent', 'all'), 'attention')).toEqual([]);
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
      const board = groupPortfolioMeters(meters, sort);
      expect(board.map(item => item.facility.guid)).toEqual(['a', 'b']);
      expect(board[0].meters.map(item => item.meter.guid)).toEqual(['a', 'z']);
    }
  });
});

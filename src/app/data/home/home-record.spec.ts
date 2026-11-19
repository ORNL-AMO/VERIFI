import { getNewIdbHomeDashboard, getNewIdbHomeOwner } from '@data/models/idbModels/homeDashboard';
import { chartWidget, homeAccountOwner, homeDefinition, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { homeEnvelopeError, readHomeDashboard, readHomeOwner } from './home-record';

describe('Home envelope routing and preservation', () => {
  it('reads supported intent and serialized backup dates without rewriting or inventing defaults', () => {
    const record = getNewIdbHomeDashboard('account-a', homeAccountOwner, homeDefinition([chartWidget()]));
    const backup = JSON.parse(JSON.stringify(record));
    expect(readHomeDashboard(backup)).toEqual({ state: 'valid', value: record.definition });
    expect(readHomeOwner(getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState())).state).toBe('valid');
  });
  it('preserves future payloads and routes locked records separately from malformed envelopes', () => {
    const record = getNewIdbHomeDashboard('account-a', homeAccountOwner, homeDefinition());
    record.definition = { version: 900, unknown: [0, null, 'kept'] };
    const before = structuredClone(record);
    expect(homeEnvelopeError(record, 'definition')).toBeUndefined();
    expect(readHomeDashboard(record).state).toBe('unsupported');
    expect(record).toEqual(before);
    record.preservation = { locked: true, references: [], transfers: [] };
    expect(readHomeDashboard(record).state).toBe('repair-required');
    expect(homeEnvelopeError({ ...record, revision: 0 }, 'definition')).toBeDefined();
    expect(homeEnvelopeError({ ...record, preservation: { references: [], transfers: [null] } }, 'definition')).toBeDefined();
    expect(homeEnvelopeError({ ...record, definition: { callback: () => 1 } }, 'definition')).toBeDefined();
  });
});

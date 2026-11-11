import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization, savedVisualizationEnvelopeError } from './saved-visualization-record';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';

function record(): IdbSavedVisualization {
  return { guid: 'visualization-a', accountId: 'account-a', recordVersion: 1, revision: 1,
    createdDate: new Date('2026-11-11T00:00:00.000Z'), modifiedDate: new Date('2026-11-11T00:00:00.000Z'), definition: utilityVisualizationFixture() };
}

describe('saved visualization envelope and version routing', () => {
  it('routes current records without mutation or normalization on repeated reads', () => {
    const input = record(), before = structuredClone(input);
    expect(readSavedVisualization(input).state).toBe('valid');
    expect(readSavedVisualization(input)).toEqual(readSavedVisualization(input));
    expect(savedVisualizationEnvelopeError(input)).toBeUndefined();
    expect(input).toEqual(before);
  });

  it('accepts serialized backup dates without modifying the raw input', () => {
    const input = JSON.parse(JSON.stringify(record()));
    const before = structuredClone(input);
    expect(savedVisualizationEnvelopeError(input)).toBeUndefined();
    expect(readSavedVisualization(input).state).toBe('valid');
    expect(input).toEqual(before);
  });

  it('accepts coherent incomplete intent as setup required', () => {
    const input = { ...record(), definition: createVisualizationDefinition('New chart', 'account-a', { kind: 'portfolio' }, 'utility') };
    expect(readSavedVisualization(input).state).toBe('setup-required');
    expect(savedVisualizationEnvelopeError(input)).toBeUndefined();
  });

  it.each([{ version: 99, future: 'keep me' }, { version: 1, malformed: 'keep me' }])('preserves opaque payloads %j', definition => {
    const input = { ...record(), definition }, before = structuredClone(input);
    expect(['invalid', 'unsupported']).toContain(readSavedVisualization(input).state);
    expect(savedVisualizationEnvelopeError(input)).toBeUndefined();
    expect(input).toEqual(before);
  });

  it('retains unknown record versions without claiming support', () => {
    const input = { ...record(), recordVersion: 99 };
    expect(savedVisualizationEnvelopeError(input)).toBeUndefined();
    expect(readSavedVisualization(input).state).toBe('unsupported');
  });

  it.each([undefined, NaN, new Date(), { callback: () => 1 }, { omitted: undefined }, [undefined]])(
    'rejects opaque payloads JSON cannot preserve', definition => {
      expect(savedVisualizationEnvelopeError({ ...record(), definition })).toBeDefined();
    });

  it('keeps transferred opaque payloads locked even when the decoder recognizes them', () => {
    const input: IdbSavedVisualization = { ...record(), accountId: 'account-b', preservation: { locked: true, references: [], transfers: [
      { accountId: 'account-a', targetAccountId: 'account-b', maps: {} }
    ] } };
    expect(savedVisualizationEnvelopeError(input)).toBeUndefined();
    expect(readSavedVisualization(input).state).toBe('repair-required');
    expect((input.definition as { accountGuid: string }).accountGuid).toBe('account-a');
  });

  it.each([
    { guid: '' }, { accountId: '' }, { facilityId: '' }, { revision: 0 }, { recordVersion: 0 }, { createdDate: 'not a date' },
    { accountId: 'other-account' }, { facilityId: 'other-facility' }, { preservation: { references: [], transfers: 'invalid' } }
  ])('rejects malformed or contradictory outer fields %j', changes => {
    expect(savedVisualizationEnvelopeError({ ...record(), ...changes })).toBeDefined();
  });
});

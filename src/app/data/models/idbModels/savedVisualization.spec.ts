import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { getNewIdbSavedVisualization } from './savedVisualization';

describe('saved visualization model factory', () => {
  it('creates independent shared entry metadata and copies definition intent', () => {
    const definition = utilityVisualizationFixture();
    const first = getNewIdbSavedVisualization(definition);
    const second = getNewIdbSavedVisualization(definition);

    expect(first.guid).not.toBe(second.guid);
    expect(first.createdDate).toBeInstanceOf(Date);
    expect(first.modifiedDate).toBeInstanceOf(Date);
    expect(first.id).toBeUndefined();
    expect(first).toMatchObject({ accountId: definition.accountGuid, recordVersion: 1, revision: 1 });
    expect(first.facilityId).toBeUndefined();
    expect(first.definition).toEqual(definition);
    expect(first.definition).not.toBe(definition);
  });

  it('retains a prepared identity and the declared facility scope', () => {
    const definition = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
    const entry = {
      guid: 'prepared-identity',
      createdDate: new Date('2026-11-11T00:00:00.000Z'),
      modifiedDate: new Date('2026-11-11T00:00:00.000Z')
    };

    const record = getNewIdbSavedVisualization(definition, entry);

    expect(record).toMatchObject({ ...entry, accountId: definition.accountGuid });
    expect(record.facilityId).toBeUndefined();
    expect(record.definition).toEqual(definition);
  });
});

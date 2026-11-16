import { sameVisualizationScope } from './visualization-scope';
import { resolveVisualizationFacilities, sameVisualizationFacilitySelection } from './visualization-facilities';
import { utilityVisualizationFixture } from './testing/visualization-fixtures';

const facility = (guid: string, accountId = 'account-a') => ({ guid, accountId });

describe('visualization facility inclusion and derived ownership', () => {
  it('follows live All through zero, one and multiple owned facilities without mutating intent', () => {
    const definition = utilityVisualizationFixture(), before = structuredClone(definition);
    expect(resolveVisualizationFacilities(definition, []).scope).toEqual({ kind: 'portfolio', facilityGuids: [] });
    expect(resolveVisualizationFacilities(definition, [facility('a'), facility('foreign', 'other')]).scope)
      .toEqual({ kind: 'facility', facilityGuid: 'a', facilityGuids: ['a'] });
    expect(resolveVisualizationFacilities(definition, [facility('a'), facility('b')]).scope)
      .toEqual({ kind: 'portfolio', facilityGuids: ['a', 'b'] });
    expect(definition).toEqual(before);
  });
  it('retains missing fixed identities rather than narrowing ownership or broadening eligibility', () => {
    const definition = { ...utilityVisualizationFixture(), facilitySelection: { kind: 'fixed' as const, facilityGuids: ['a', 'missing'] } };
    expect(resolveVisualizationFacilities(definition, [facility('a'), facility('b')]))
      .toEqual({ scope: { kind: 'portfolio', facilityGuids: ['a'] }, missingFacilityGuids: ['missing'] });
    expect(resolveVisualizationFacilities({ ...definition, facilitySelection: { kind: 'fixed', facilityGuids: ['missing'] } }, [facility('a')]))
      .toEqual({ scope: { kind: 'facility', facilityGuid: 'missing', facilityGuids: [] }, missingFacilityGuids: ['missing'] });
  });
  it('compares inclusion as a set but never treats an empty eligibility boundary as All', () => {
    expect(sameVisualizationFacilitySelection({ kind: 'fixed', facilityGuids: ['a', 'b'] }, { kind: 'fixed', facilityGuids: ['b', 'a'] })).toBe(true);
    expect(sameVisualizationFacilitySelection({ kind: 'all' }, { kind: 'fixed', facilityGuids: ['a', 'b'] })).toBe(false);
    expect(sameVisualizationScope({ kind: 'portfolio', facilityGuids: ['a', 'b'] }, { kind: 'portfolio', facilityGuids: ['b', 'a'] })).toBe(true);
    expect(sameVisualizationScope({ kind: 'portfolio', facilityGuids: [] }, { kind: 'portfolio', facilityGuids: ['a', 'b'] })).toBe(false);
  });
});

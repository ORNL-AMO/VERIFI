import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewAccountCustomFuel } from '@data/models/idbModels/customFuel';
import { STANDARD_FUEL_GROUPS, applyStandardFuel, buildStandardFuelSelection, calculatedOutputRate, displayEmissionsRate, storedEmissionsRate } from './custom-fuel.models';

describe('custom fuel models', () => {
  it('round trips stationary emissions between stored MMBtu and account display units', () => {
    const displayed = displayEmissionsRate(53.06, 'kWh');

    expect(displayed).toBeCloseTo(0.181, 3);
    expect(storedEmissionsRate(displayed, 'kWh')).toBeCloseTo(53.06, 8);
  });

  it('calculates the direct-equivalent output rate with AR5 factors', () => {
    expect(calculatedOutputRate(50, 2, 1)).toBe(50.321);
  });

  it('clones a standard option before decorating its mobile name', () => {
    const group = STANDARD_FUEL_GROUPS.find(candidate => candidate.nameSuffix)!;
    const source = group.options[0];
    const originalName = source.value;

    const selection = buildStandardFuelSelection(group, source);

    expect(selection.option).not.toBe(source);
    expect(selection.option.value).toContain(group.nameSuffix);
    expect(source.value).toBe(originalName);
  });

  it('applies standard values using account units without changing record identity', () => {
    const account = { ...getNewIdbAccount(), guid: 'account-a', energyUnit: 'kWh', volumeGasUnit: 'm3' };
    const draft = getNewAccountCustomFuel(account);
    const group = STANDARD_FUEL_GROUPS.find(candidate => candidate.id === 'stationary-gas')!;

    const result = applyStandardFuel(draft, buildStandardFuelSelection(group, group.options[0]), account);

    expect(result.guid).toBe(draft.guid);
    expect(result.value).toContain('(Modified)');
    expect(result.startingUnit).toBe('m3');
    expect(result.heatCapacityValue).toBeGreaterThan(0);
  });
});

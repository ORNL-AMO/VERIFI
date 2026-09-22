import { describe, expect, it } from 'vitest';
import { GlobalWarmingPotentials } from '@data/models/globalWarmingPotentials';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import {
  allocateCustomGwpValue,
  applyStandardGwp,
  globalWarmingPotentialValue,
  hasDifferentAssessmentValues
} from './custom-gwp.models';

describe('custom GWP models', () => {
  const custom = {
    guid: 'gwp-a',
    accountId: 'account-a',
    label: 'Custom gas',
    display: 'Custom gas',
    value: 50_000,
    gwp_ar4: 10,
    gwp_ar5: 20,
    gwp_ar6: 30
  } as IdbCustomGWP;

  it('selects the value for the account assessment-report version', () => {
    expect(globalWarmingPotentialValue(custom, 'AR4')).toBe(10);
    expect(globalWarmingPotentialValue(custom, 'AR5')).toBe(20);
    expect(globalWarmingPotentialValue(custom, 'AR6')).toBe(30);
    expect(hasDifferentAssessmentValues(custom)).toBe(true);
  });

  it('allocates a stable identifier that does not collide with standard or custom values', () => {
    const next = allocateCustomGwpValue([
      { ...custom, value: 50_000 },
      { ...custom, guid: 'gwp-b', value: 50_001 }
    ]);

    expect(next).toBe(50_002);
    expect(GlobalWarmingPotentials.some(option => option.value === next)).toBe(false);
  });

  it('clones a standard value for the selected report without mutating the standard option', () => {
    const source = GlobalWarmingPotentials.find(option => option.gwp_ar5 !== option.gwp_ar6)!;
    const sourceBefore = { ...source };

    const result = applyStandardGwp(custom, source, 'AR5');

    expect(result).toMatchObject({
      label: `${source.label} (Modified)`,
      display: `${source.label} (Modified)`,
      gwp_ar4: source.gwp_ar5,
      gwp_ar5: source.gwp_ar5,
      gwp_ar6: source.gwp_ar5,
      value: custom.value
    });
    expect(source).toEqual(sourceBefore);
  });
});

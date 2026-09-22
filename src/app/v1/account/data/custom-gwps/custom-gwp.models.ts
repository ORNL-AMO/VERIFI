import { GlobalWarmingPotential, GlobalWarmingPotentials } from '@data/models/globalWarmingPotentials';
import { AssessmentReportVersion } from '@data/models/idbModels/account';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';

export function globalWarmingPotentialValue(
  option: Pick<GlobalWarmingPotential, 'gwp_ar4' | 'gwp_ar5' | 'gwp_ar6'>,
  version: AssessmentReportVersion
): number {
  if (version === 'AR5') return option.gwp_ar5;
  if (version === 'AR6') return option.gwp_ar6;
  return option.gwp_ar4;
}

export function allocateCustomGwpValue(customGwps: readonly IdbCustomGWP[]): number {
  const used = new Set([
    ...GlobalWarmingPotentials.map(option => option.value),
    ...customGwps.map(option => option.value)
  ]);
  let candidate = 50_000;
  while (used.has(candidate)) candidate += 1;
  return candidate;
}

export function applyStandardGwp(
  draft: IdbCustomGWP,
  source: GlobalWarmingPotential,
  version: AssessmentReportVersion
): IdbCustomGWP {
  const value = globalWarmingPotentialValue(source, version);
  return {
    ...draft,
    label: `${source.label} (Modified)`,
    display: `${source.label} (Modified)`,
    gwp_ar4: value,
    gwp_ar5: value,
    gwp_ar6: value
  };
}

export function hasDifferentAssessmentValues(gwp: IdbCustomGWP): boolean {
  return gwp.gwp_ar4 !== gwp.gwp_ar5 || gwp.gwp_ar4 !== gwp.gwp_ar6;
}

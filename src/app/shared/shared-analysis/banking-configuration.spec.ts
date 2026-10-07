import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import {
  evaluateBankedGroupConfiguration,
  evaluateBankingSource,
  getBankedAnalysisGroup,
  isBankedGroupConfigurationComplete
} from './banking-configuration';

describe('banking configuration', () => {
  const group = (overrides: Partial<AnalysisGroup> = {}) => ({
    idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [],
    applyBanking: false, models: [], ...overrides
  } as AnalysisGroup);
  const analysis = (guid: string, overrides: Partial<IdbAnalysisItem> = {}) => ({
    guid, facilityId: 'facility-a', accountId: 'account-a', name: guid,
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    baselineYear: 2022, hasBanking: false, groups: [group()], ...overrides
  } as IdbAnalysisItem);

  it.each([
    ['missing source', 'missing', undefined],
    ['incompatible source', 'incompatible', analysis('source', { energyIsSource: true })],
    ['missing transitive dependency', 'dependency-missing', analysis('source', {
      hasBanking: true, bankedAnalysisItemId: 'deleted'
    })]
  ])('rejects a %s', (_label, issue, source) => {
    const current = analysis('current', { hasBanking: true, bankedAnalysisItemId: 'source' });
    const analyses = source ? [current, source] : [current];

    expect(evaluateBankingSource(current, analyses).issue).toBe(issue);
  });

  it('rejects direct and transitive cycles', () => {
    const current = analysis('current', { hasBanking: true, bankedAnalysisItemId: 'source' });
    const source = analysis('source', { hasBanking: true, bankedAnalysisItemId: 'dependency' });
    const dependency = analysis('dependency', { hasBanking: true, bankedAnalysisItemId: 'current' });

    expect(evaluateBankingSource(current, [current, source, dependency]).issue).toBe('cycle');
  });

  it('bounds both years and rejects stale persisted selections', () => {
    const configuredGroup = group({ applyBanking: true, bankedAnalysisYear: 2021, newBaselineYear: 2026 });
    const current = analysis('current', {
      baselineYear: 2023, hasBanking: true, bankedAnalysisItemId: 'source', groups: [configuredGroup]
    });
    const source = analysis('source', { baselineYear: 2020, groups: [group()] });

    const stale = evaluateBankedGroupConfiguration(current, configuredGroup, [current, source], 2025);
    expect(stale.appliedYears).toEqual([2021, 2022, 2023, 2024, 2025]);
    expect(stale.newBaselineYears).toEqual([2023, 2024, 2025]);
    expect(stale.groupIssue).toBe('baseline-year-out-of-range');

    configuredGroup.newBaselineYear = 2024;
    expect(evaluateBankedGroupConfiguration(current, configuredGroup, [current, source], 2025).valid).toBe(true);
    configuredGroup.bankedAnalysisYear = 2020;
    expect(evaluateBankedGroupConfiguration(current, configuredGroup, [current, source], 2025).groupIssue)
      .toBe('applied-year-out-of-range');
  });

  it('keeps the calculation-readiness contract for a complete matching group', () => {
    const configuredGroup = group({ applyBanking: true, bankedAnalysisYear: 2021, newBaselineYear: 2022 });
    const current = analysis('current', {
      hasBanking: true, bankedAnalysisItemId: 'source', groups: [configuredGroup]
    });
    const source = analysis('source', { groups: [group()] });

    expect(getBankedAnalysisGroup(current, configuredGroup, source)).toBe(source.groups[0]);
    expect(isBankedGroupConfigurationComplete(current, configuredGroup, source)).toBe(true);
  });

  it.each([
    ['banking is not applied', group()],
    ['applied year is missing', group({ applyBanking: true, newBaselineYear: 2022 })],
    ['new baseline is missing', group({ applyBanking: true, bankedAnalysisYear: 2021 })],
    ['year order is invalid', group({ applyBanking: true, bankedAnalysisYear: 2022, newBaselineYear: 2022 })]
  ])('keeps calculation readiness false when %s', (_label, configuredGroup) => {
    const current = analysis('current', {
      hasBanking: true, bankedAnalysisItemId: 'source', groups: [configuredGroup]
    });
    const source = analysis('source', { groups: [group()] });

    expect(isBankedGroupConfigurationComplete(current, configuredGroup, source)).toBe(false);
  });
});

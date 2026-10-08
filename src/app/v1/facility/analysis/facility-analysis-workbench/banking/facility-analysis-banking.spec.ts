import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import {
  bankedSavingsChartMonthlyRows,
  bankedSavingsPreviewRows,
  bankingDependencyIncludes,
  bankingPreviewReportYear,
  bankingSourceOptions,
  bankingTabAvailable,
  bankingYearOptions,
  usableBankedGroup
} from './facility-analysis-banking';

describe('facility analysis banking presentation', () => {
  const group = (overrides: Partial<AnalysisGroup> = {}) => ({
    idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [],
    applyBanking: false, models: [], ...overrides
  } as AnalysisGroup);
  const analysis = (guid: string, overrides: Partial<IdbAnalysisItem> = {}) => ({
    guid, facilityId: 'facility-a', accountId: 'account-a', name: guid,
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    baselineYear: 2020, hasBanking: false, groups: [group()], ...overrides
  } as IdbAnalysisItem);

  it('sorts compatible sources and rejects circular dependencies', () => {
    const current = analysis('current');
    const older = analysis('older', { baselineYear: 2018 });
    const newest = analysis('newest', { baselineYear: 2022, hasBanking: true, bankedAnalysisItemId: current.guid });
    const warning = analysis('warning', { baselineYear: 2021 });
    const findings = [{
      severity: 'warning', entity: { guid: warning.guid }, title: 'Review model'
    }] as any;

    const options = bankingSourceOptions(current, [current, older, newest, warning], findings);

    expect(options.map(option => option.sourceGuid)).toEqual(['newest', 'warning', 'older']);
    expect(options[0]).toMatchObject({ validation: 'unavailable', blockingReason: expect.stringContaining('circular') });
    expect(options[1]).toMatchObject({ validation: 'warning', warnings: ['Review model'] });
    expect(bankingDependencyIncludes(newest, current.guid, [current, newest])).toBe(true);
  });

  it('derives bounded banking years from real data availability', () => {
    expect(bankingYearOptions(2019, 2022, { source: 2023, consumer: 2024 })).toEqual({
      appliedYears: [2020, 2021, 2022, 2023],
      newBaselineYears: [2022, 2023, 2024]
    });
    expect(bankingYearOptions(2025, 2024, { source: 2024, consumer: 2024 }).appliedYears).toEqual([]);
  });

  it('exposes a usable matching source group before banking is applied', () => {
    const currentGroup = group({ applyBanking: false });
    const current = analysis('current', {
      hasBanking: true,
      bankedAnalysisItemId: 'source',
      groups: [currentGroup]
    });
    const sourceGroup = group();
    const source = analysis('source', { groups: [sourceGroup] });

    expect(usableBankedGroup(current, currentGroup, [current, source])).toBe(sourceGroup);
  });

  it('exposes the Banking tab only for a complete, usable, unblocked source configuration', () => {
    const currentGroup = group({
      analysisType: 'regression', applyBanking: true, bankedAnalysisYear: 2022, newBaselineYear: 2023
    });
    const current = analysis('current', { hasBanking: true, bankedAnalysisItemId: 'source', groups: [currentGroup] });
    const source = analysis('source', { groups: [group()] });

    const bounds = { consumer: 2024, source: 2024 };
    expect(bankingTabAvailable(current, currentGroup, [current, source], [], bounds)).toBe(true);
    expect(bankingTabAvailable(current, currentGroup, [current, source], [{
      severity: 'error', entity: { guid: `${current.guid}:${currentGroup.idbGroupId}` },
      evidence: { reasons: ['missingRegressionModelSelection'] }
    }] as any, bounds)).toBe(true);
    expect(bankingTabAvailable(current, currentGroup, [current, source], [{
      severity: 'error', entity: { guid: source.guid }
    }] as any, bounds)).toBe(false);
    expect(bankingTabAvailable(current, currentGroup, [current, source], [{
      severity: 'error', entity: { guid: current.guid }, evidence: { reasons: ['bankingError'] }
    }] as any, bounds)).toBe(false);
    expect(bankingTabAvailable(current, currentGroup, [current, analysis('source', {
      groups: [group({ analysisType: 'skip' })]
    })], [], bounds)).toBe(false);
    expect(bankingTabAvailable(
      current, { ...currentGroup, bankedAnalysisYear: 2025 }, [current, source], [], bounds
    )).toBe(false);
  });

  it('projects the preview through the year before the new baseline and carries applied-year improvement', () => {
    const rows = [2019, 2020, 2021, 2022].map(year => ({
      year, totalSavingsPercentImprovement: year - 2018
    } as AnnualAnalysisSummary));

    const preview = bankedSavingsPreviewRows(rows, 2020, 2023);

    expect(bankingPreviewReportYear(group({ bankedAnalysisYear: 2020, newBaselineYear: 2023 }))).toBe(2022);
    expect(preview.map(row => ({ year: row.summary.year, transition: row.transition, total: row.totalSavingsPercentImprovement })))
      .toEqual([
        { year: 2019, transition: false, total: 1 },
        { year: 2020, transition: false, total: 2 },
        { year: 2021, transition: true, total: 2 },
        { year: 2022, transition: true, total: 2 }
      ]);
    expect(bankedSavingsPreviewRows(rows, 2022, 2023).some(row => row.transition)).toBe(false);
  });

  it('preserves transition periods already present in the banking source', () => {
    const annual = [
      { year: 2021, isIntermediateBanked: false, totalSavingsPercentImprovement: 8 },
      { year: 2022, isIntermediateBanked: true, totalSavingsPercentImprovement: 8 }
    ] as AnnualAnalysisSummary[];
    const monthly = [
      {
        date: new Date(2021, 11, 1), fiscalYear: 2021, isIntermediateBanked: false,
        percentSavingsComparedToBaseline: 8
      },
      {
        date: new Date(2022, 0, 1), fiscalYear: 2022, isIntermediateBanked: true,
        percentSavingsComparedToBaseline: 8
      }
    ] as MonthlyAnalysisSummaryData[];

    expect(bankedSavingsPreviewRows(annual, 2024, 2025).map(row => row.transition)).toEqual([false, true]);
    expect(bankedSavingsChartMonthlyRows(monthly, 2024, 2025).map(row => row.isIntermediateBanked))
      .toEqual([false, true]);
  });

  it('projects monthly chart rows through transition without mutating source results', () => {
    const rows = [2021, 2022, 2023].map(year => ({
      date: new Date(year, 0, 1), fiscalYear: year, isBanked: false, isIntermediateBanked: false,
      percentSavingsComparedToBaseline: year - 2020
    } as MonthlyAnalysisSummaryData));

    const projected = bankedSavingsChartMonthlyRows(rows, 2021, 2023);

    expect(projected.map(row => ({
      year: row.fiscalYear,
      banked: row.isBanked,
      transition: row.isIntermediateBanked,
      improvement: row.percentSavingsComparedToBaseline
    }))).toEqual([
      { year: 2021, banked: true, transition: false, improvement: 1 },
      { year: 2022, banked: true, transition: true, improvement: 1 }
    ]);
    expect(rows.every(row => !row.isBanked && !row.isIntermediateBanked)).toBe(true);
  });

});

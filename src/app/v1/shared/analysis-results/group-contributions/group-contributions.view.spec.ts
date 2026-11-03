import { AnalysisGroup, AnnualAnalysisSummary } from '@data/models/analysis';
import { FacilityGroupContributionSource, facilityGroupContributionsView } from './group-contributions.view';

function annual(year: number, savings: number, adjusted: number, totalSavingsPercentImprovement = 0): AnnualAnalysisSummary {
  return { year, savings, adjusted, totalSavingsPercentImprovement } as AnnualAnalysisSummary;
}
function group(id: string, rows: readonly AnnualAnalysisSummary[], analysisType: AnalysisGroup['analysisType'] = 'absoluteEnergyConsumption'): FacilityGroupContributionSource {
  return { group: { idbGroupId: id, analysisType } as AnalysisGroup, annualAnalysisSummaryData: rows };
}

describe('shared facility group contributions', () => {
  it('uses adjusted facility consumption as the denominator and preserves group order, precision, losses and missing years', () => {
    const annualRows = [annual(2025, 8, 0, 2), annual(2023, 0, 900), annual(2024, 100.5, 1000, 10.05)];
    const groupRows = [group('electric', [annual(2024, 125.5, 500, 12.55), annual(2025, 8, 100, 2)]),
      group('gas', [annual(2024, -25, 500, -5)]), group('skip', [annual(2024, 999, 1000)], 'skip'),
      group('skip-analysis', [annual(2024, 999, 1000)], 'skipAnalysis')];
    const before = structuredClone({ annualRows, groupRows });
    const view = facilityGroupContributionsView(annualRows, groupRows, new Map([['electric', 'Electricity'], ['gas', 'Natural gas']]));
    expect(view.groups.map(item => item.groupName)).toEqual(['Electricity', 'Natural gas']);
    expect(view.years.map(item => item.year)).toEqual([2024, 2025]);
    expect(view.years[0]).toMatchObject({ totalSavings: 100.5, totalSavingsPercent: 10.05, totalContributionPercent: 10.05 });
    expect(view.years[0].groups).toEqual([
      { groupId: 'electric', groupName: 'Electricity', savings: 125.5, savingsPercent: 12.55, contributionPercent: 12.55 },
      { groupId: 'gas', groupName: 'Natural gas', savings: -25, savingsPercent: -5, contributionPercent: -2.5 }
    ]);
    expect(view.years[1].totalContributionPercent).toBe(0);
    expect(view.years[1].groups[1]).toMatchObject({ savings: 0, savingsPercent: 0, contributionPercent: 0 });
    expect({ annualRows, groupRows }).toEqual(before);
  });

  it('keeps zero-saving years after the baseline and retains a nonzero first year', () => {
    const rows = [annual(2023, 0, 100), annual(2024, 0, 100), annual(2025, 1, 3)];
    const view = facilityGroupContributionsView(rows, [group('group', rows)], new Map());
    expect(view.years.map(item => item.year)).toEqual([2024, 2025]);
    expect(view.years[1].groups[0].contributionPercent).toBe(33.33333333333333);
    expect(facilityGroupContributionsView([annual(2024, 2, 100)], [group('group', rows)], new Map()).years).toHaveLength(1);
  });

  it('leaves baseline-only output without post-baseline comparison years', () => {
    const rows = [annual(2023, 0, 100)];
    expect(facilityGroupContributionsView(rows, [group('group', rows)], new Map())).toEqual({
      groups: [{ groupId: 'group', groupName: 'group' }], years: []
    });
  });
});

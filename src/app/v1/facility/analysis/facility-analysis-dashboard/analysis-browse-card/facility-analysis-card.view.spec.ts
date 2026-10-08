import { facilityAnalysisOutcomeDisplay } from '../../facility-analysis-outcome-summary';
import { FacilityAnalysisDashboardCard } from '../facility-analysis.models';
import { buildFacilityAnalysisResourceView } from './facility-analysis-card.view';

describe('buildFacilityAnalysisResourceView', () => {
  it('prioritizes annual and monthly improvement instead of group/model counts', () => {
    const outcome = {
      state: 'ready' as const,
      summary: {
        annual: { periodLabel: 'FY 2025', value: 8.75 },
        monthly: { periodLabel: 'Sep 2026', value: -2.5 }
      }
    };
    const view = buildFacilityAnalysisResourceView({
      analysis: {
        guid: 'analysis-a', name: 'Energy performance', baselineYear: 2020,
        analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', groups: []
      },
      category: 'energy', status: 'ready', statusLabel: 'Ready', findings: [],
      isActiveForReporting: false, linkedAccountAnalyses: [], linkedReports: [], bankingConsumers: [],
      dependencyCount: 0, modifiedDateLabel: 'Oct 8, 2026', modifiedSortValue: 0,
      searchText: '', attentionRank: 3, outcome,
      outcomeDisplay: facilityAnalysisOutcomeDisplay(outcome, 'energy')
    } as unknown as FacilityAnalysisDashboardCard);

    expect(view.factSections?.[0].facts).toEqual([
      expect.objectContaining({ id: 'annual', label: 'Latest full year · FY 2025', valueLabel: '8.75%' }),
      expect.objectContaining({ id: 'monthly', label: 'Latest month · Sep 2026', valueLabel: '-2.5%' })
    ]);
    expect(view.factSections?.flatMap(section => section.facts).map(fact => fact.id)).toEqual([
      'annual', 'monthly', 'baseline', 'basis'
    ]);
    expect(view.footerTag?.label).toBe('Updated Oct 8, 2026 · No downstream links');
  });

  it('shows explicit blocked outcome text without presenting a percentage', () => {
    const outcome = { state: 'blocked' as const, message: 'Setup incomplete' };
    const view = buildFacilityAnalysisResourceView({
      analysis: { guid: 'analysis-a', name: 'Water performance', analysisCategory: 'water', waterUnit: 'gal', groups: [] },
      category: 'water', status: 'error', statusLabel: 'Error', findings: [], isActiveForReporting: false,
      linkedAccountAnalyses: [], linkedReports: [], bankingConsumers: [], dependencyCount: 0,
      modifiedDateLabel: 'Unknown', modifiedSortValue: 0, searchText: '', attentionRank: 0,
      outcome, outcomeDisplay: facilityAnalysisOutcomeDisplay(outcome, 'water')
    } as unknown as FacilityAnalysisDashboardCard);

    expect(view.factSections?.[0].facts.every(fact => fact.valueLabel === 'Setup incomplete' && fact.unavailable)).toBe(true);
    expect(view.factSections?.[1].facts).toContainEqual(expect.objectContaining({
      id: 'basis', valueLabel: 'Water · gal'
    }));
  });
});

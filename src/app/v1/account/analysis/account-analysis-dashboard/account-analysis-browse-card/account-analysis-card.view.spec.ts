import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { buildAccountAnalysisCards } from '../account-analysis.models';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { buildAccountAnalysisResourceView } from './account-analysis-card.view';

function card() {
  return buildAccountAnalysisCards({
    analyses: [{
      guid: 'analysis-a', accountId: 'account-a', name: 'Corporate analysis', analysisCategory: 'energy',
      energyIsSource: true, energyUnit: 'MMBtu', baselineYear: 2022, facilityAnalysisItems: [], modifiedDate: new Date('2026-10-13')
    } as IdbAccountAnalysisItem],
    facilities: [], facilityAnalyses: [], reports: [], statusItems: [], statusState: 'ready'
  })[0];
}

describe('account analysis resource view', () => {
  it('supports a setup/status summary without requesting calculation outcomes', () => {
    const view = buildAccountAnalysisResourceView(card());
    expect(view.factSections?.map(section => section.id)).toEqual(['setup']);
    expect(view.factSections?.[0].facts.map(fact => fact.id)).toEqual(['baseline', 'basis', 'facilities']);
    expect(view.factSections?.[0].facts).toContainEqual(expect.objectContaining({ id: 'basis', valueLabel: 'Source energy · MMBtu' }));
  });

  it('preserves dashboard outcome facts when a dashboard card supplies them', () => {
    const outcome = { state: 'ready' as const, summary: {
      annual: { periodLabel: 'FY 2025', value: 8.75 }, monthly: { periodLabel: 'Sep 2026', value: -2.5 }
    }, annualAnalysisSummaries: [] };
    const view = buildAccountAnalysisResourceView({ ...card(), outcome, outcomeDisplay: analysisOutcomeDisplay(outcome, 'energy') });
    expect(view.factSections?.map(section => section.id)).toEqual(['outcomes', 'setup']);
    expect(view.factSections?.[0].facts).toEqual([
      expect.objectContaining({ label: 'Latest full year · FY 2025', valueLabel: '8.75%' }),
      expect.objectContaining({ label: 'Latest month · Sep 2026', valueLabel: '-2.5%' })
    ]);
  });
});

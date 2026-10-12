import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import {
  buildAccountAnalysisCards,
  buildAccountAnalysisFacilitySelections,
  filterAndSortAccountAnalysisCards
} from './account-analysis.models';

describe('account analysis dashboard models', () => {
  const account = {
    guid: 'account-a',
    selectedEnergyAnalysisId: 'account-analysis-a'
  } as IdbAccount;
  const facilities = [
    { guid: 'facility-a', name: 'Alpha' },
    { guid: 'facility-b', name: 'Beta' },
    { guid: 'facility-c', name: 'Gamma' },
    { guid: 'facility-d', name: 'Delta' }
  ] as IdbFacility[];
  const facilityAnalyses = [
    { guid: 'analysis-a', facilityId: 'facility-a', name: 'Alpha energy', analysisCategory: 'energy' },
    { guid: 'analysis-water', facilityId: 'facility-d', name: 'Delta water', analysisCategory: 'water' }
  ] as IdbAnalysisItem[];
  const analysis = {
    guid: 'account-analysis-a',
    accountId: 'account-a',
    name: 'Portfolio energy',
    analysisCategory: 'energy',
    baselineYear: 2022,
    energyIsSource: true,
    energyUnit: 'MMBtu',
    waterUnit: 'gal',
    modifiedDate: new Date('2026-01-02'),
    facilityAnalysisItems: [
      { facilityId: 'facility-a', analysisItemId: 'analysis-a' },
      { facilityId: 'facility-b', analysisItemId: 'skip' },
      { facilityId: 'facility-c', analysisItemId: 'missing-guid' },
      { facilityId: 'facility-d', analysisItemId: 'analysis-water' }
    ]
  } as IdbAccountAnalysisItem;

  it('projects included, skipped, missing, and invalid facility selections', () => {
    const selections = buildAccountAnalysisFacilitySelections(analysis, facilities, facilityAnalyses);
    expect(selections.map(selection => selection.state)).toEqual(['included', 'skipped', 'missing', 'invalid']);
    expect(selections[0]).toMatchObject({ facilityName: 'Alpha', analysisName: 'Alpha energy' });
  });

  it('discovers links from all four account report analysis fields', () => {
    const reports = [
      ['betterPlants', 'betterPlantsReportSetup'],
      ['performance', 'performanceReportSetup'],
      ['analysis', 'analysisReportSetup'],
      ['accountSavings', 'accountSavingsReportSetup']
    ].map(([reportType, field], index) => ({
        guid: `report-${index}`,
        name: `Report ${index}`,
        reportType,
        [field]: { analysisItemId: analysis.guid }
      })) as unknown as IdbAccountReport[];
    const [card] = buildAccountAnalysisCards({
      account,
      analyses: [analysis],
      facilities,
      facilityAnalyses,
      reports,
      statusItems: [],
      statusState: 'ready'
    });
    expect(card.linkedReports).toHaveLength(4);
    expect(card.selectionCounts).toEqual({ included: 1, skipped: 1, missing: 1, invalid: 1 });
    expect(card.isActiveForReporting).toBe(true);
  });

  it('ignores an analysis reference retained in an inactive report setup', () => {
    const [card] = buildAccountAnalysisCards({
      account,
      analyses: [analysis],
      facilities,
      facilityAnalyses,
      reports: [{
        guid: 'report-a', name: 'Overview', reportType: 'dataOverview',
        betterPlantsReportSetup: { analysisItemId: analysis.guid }
      } as IdbAccountReport],
      statusItems: [],
      statusState: 'ready'
    });
    expect(card.linkedReports).toEqual([]);
  });

  it('filters searchable facility facts and applies stable attention ordering', () => {
    const warning = { ...analysis, guid: 'warning', name: 'Zulu' } as IdbAccountAnalysisItem;
    const cards = buildAccountAnalysisCards({
      account,
      analyses: [analysis, warning],
      facilities,
      facilityAnalyses,
      reports: [],
      statusItems: [{
        id: 'finding', severity: 'warning', entity: { kind: 'account-analysis', guid: 'warning' }
      } as any],
      statusState: 'ready'
    });
    expect(filterAndSortAccountAnalysisCards(cards, {
      search: 'alpha energy', category: 'all', status: 'all', sort: 'attention'
    }).map(card => card.analysis.guid)).toEqual(['warning', 'account-analysis-a']);
  });
});

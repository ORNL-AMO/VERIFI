import { buildAccountAnalysisCards } from './account-analysis.models';
import { buildFacilityAnalysisCards } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis.models';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { AnalysisInventoryEntry } from './analysis-inventory.models';

export const inventoryAccount = { guid: 'account-a', name: 'Portfolio A', selectedEnergyAnalysisId: 'account-energy',
  sustainabilityQuestions: { energyReductionBaselineYear: 2022, waterReductionBaselineYear: 2022 }, fiscalYear: 'calendarYear' } as IdbAccount;
export function inventoryFacility(guid = 'facility-a'): IdbFacility {
  return { guid, accountId: 'account-a', name: guid === 'facility-a' ? 'Riverbend Plant' : 'Cedar Grove Plant', fiscalYear: 'calendarYear', selectedEnergyAnalysisId: `${guid}-energy` } as IdbFacility;
}
export function accountEntry(guid = 'account-energy', category: 'energy' | 'water' = 'energy'): AnalysisInventoryEntry {
  const analysis = { guid, accountId: 'account-a', name: guid, analysisCategory: category, baselineYear: 2022,
    energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', modifiedDate: new Date('2026-01-01'), facilityAnalysisItems: [] } as unknown as IdbAccountAnalysisItem;
  const card = buildAccountAnalysisCards({ account: inventoryAccount, analyses: [analysis], facilities: [], facilityAnalyses: [], reports: [], statusItems: [], statusState: 'ready' })[0];
  return { scope: 'account', key: `account:${guid}`, ownerName: inventoryAccount.name, card };
}
export function facilityEntry(guid = 'facility-a-energy', facility = inventoryFacility()): AnalysisInventoryEntry {
  const analysis = { guid, accountId: 'account-a', facilityId: facility.guid, name: guid, analysisCategory: 'energy', baselineYear: 2022,
    energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', groups: [], modifiedDate: new Date('2026-01-01') } as unknown as IdbAnalysisItem;
  const card = buildFacilityAnalysisCards({ facility, analyses: [analysis], accountAnalyses: [], reports: [], meterGroups: [], statusItems: [], statusState: 'ready' })[0];
  return { scope: 'facility', key: `facility:${guid}`, ownerName: facility.name, facility, card };
}
export function inventoryOutcome(value = 12.5, annualAnalysisSummaries: readonly any[] = []): any {
  return { state: 'ready', annualAnalysisSummaries, summary: { annual: { periodLabel: '2025', value }, monthly: { periodLabel: 'Jan 2026', value } } };
}

import { analysisInventoryStatusLabel, analysisInventoryTile, filterAnalysisInventory } from './analysis-inventory.models';
import { accountEntry, facilityEntry, inventoryAccount, inventoryFacility, inventoryOutcome } from '@app/v1/account/analysis/account-analysis-dashboard/analysis-inventory.testing';
import { buildAccountAnalysisCards } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis.models';
import { BrowseFilters } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { makeFinding } from '@app/v1/status/status.models';
import { presentFinding } from '@app/v1/status/status.catalog';

const filters: BrowseFilters['analyses'] = { search: '', scope: 'all', category: 'all', status: 'all', sort: 'attention' };
const navigation = {
  accountAnalysisWorkbenchRoute: (account: string, guid: string) => ['/account', account, guid],
  accountAnalysisRoute: (account: string) => ['/account', account],
  facilityAnalysisWorkbenchRoute: (facility: string, guid: string) => ['/facility', facility, guid],
  facilityAnalysisRoute: (facility: string) => ['/facility', facility]
} as any;

describe('analysis inventory projection', () => {
  it.each([
    ['ready', 'ready', 'All data valid'], ['warning', 'ready', 'Has warnings'], ['error', 'ready', 'Has errors'],
    ['evaluating', 'evaluating', 'Checks pending'], ['error', 'error', 'Checks unavailable']
  ] as const)('uses the Data status language for %s/%s', (status, evaluation, label) => {
    expect(analysisInventoryStatusLabel(status, evaluation)).toBe(label);
  });
  it('keeps separate scope identities even with duplicate names and GUIDs', () => {
    const account = accountEntry('same'), facility = facilityEntry('same');
    const tiles = [account, facility].map(entry => analysisInventoryTile(entry, inventoryOutcome(), [], navigation, 'account-a'));
    expect(tiles.map(tile => tile.guid)).toEqual(['account:same', 'facility:same']);
    expect(tiles.map(tile => tile.route)).toEqual([['/account', 'account-a', 'same'], ['/facility', 'facility-a', 'same']]);
    expect(tiles.map(tile => tile.analysisSnapshot?.scope)).toEqual(['account', 'facility']);
    expect(tiles.map(tile => tile.icon)).toEqual(['accountAnalysis', 'analysis']);
    expect(tiles[0].owner).toBeUndefined(); expect(tiles[1].owner?.label).toBe('Riverbend Plant');
  });
  it('searches owners and category while keeping active reporting scoped to each owner', () => {
    const entries = [accountEntry(), facilityEntry(), facilityEntry('other', inventoryFacility('facility-b'))];
    expect(filterAnalysisInventory(entries, { ...filters, search: 'Riverbend' }).map(e => e.key)).toEqual(['facility:facility-a-energy']);
    expect(filterAnalysisInventory(entries, { ...filters, scope: 'facility', status: 'active' })).toHaveLength(1);
    expect(filterAnalysisInventory(entries, { ...filters, scope: 'account', category: 'water' })).toEqual([]);
  });
  it('uses explicit unavailable values and preserves real zero improvement', () => {
    const entry = accountEntry();
    expect(analysisInventoryTile(entry, undefined, [], navigation, 'account-a').analysisSnapshot?.outcomes[0].value).toBe('Results not loaded');
    expect(analysisInventoryTile(entry, inventoryOutcome(0), [], navigation, 'account-a').analysisSnapshot?.outcomes[0]).toMatchObject({ value: '0%', unavailable: false });
    expect(analysisInventoryTile(entry, { state: 'blocked', message: 'Setup incomplete' }, [], navigation, 'account-a').analysisSnapshot?.outcomes[0]).toMatchObject({ value: 'Setup incomplete', unavailable: true });
  });
  it('uses setup-valid facility progress, omits the account roster, and retains account attention findings', () => {
    const account = accountEntry(), facility = facilityEntry();
    if (account.scope !== 'account' || facility.scope !== 'facility') throw new Error('Expected explicit ownership');
    const facilities = Array.from({ length: 5 }, (_, index) => inventoryFacility(`facility-${index}`));
    const selected = [0, 3, 4].map(index => ({ ...facility.card.analysis, guid: `analysis-${index}`, facilityId: facilities[index].guid, baselineYear: index === 4 ? 2023 : 2022 }));
    const analysis = { ...account.card.analysis, facilityAnalysisItems: facilities.map((item, index) => ({ facilityId: item.guid, analysisItemId: index === 1 ? 'skip' : index === 2 ? undefined : `analysis-${index}` })) };
    const childError = presentFinding(makeFinding('analysis.configuration.invalid', 'error', 'configuration', {
      kind: 'facility-analysis', guid: 'analysis-3', name: 'Incomplete facility analysis', accountGuid: 'account-a', facilityGuid: facilities[3].guid
    }, { reasons: ['missingBaselineYear'] }));
    const accountError = presentFinding(makeFinding('account-analysis.configuration.invalid', 'error', 'configuration', {
      kind: 'account-analysis', guid: analysis.guid, name: analysis.name, accountGuid: 'account-a'
    }, { reasons: ['missingSelection'] }));
    const card = buildAccountAnalysisCards({ account: inventoryAccount, analyses: [analysis], facilities, facilityAnalyses: selected, reports: [], statusItems: [childError, accountError], statusState: 'ready' })[0];
    const snapshot = analysisInventoryTile({ ...account, card }, undefined, [], navigation, 'account-a').analysisSnapshot!;
    expect(snapshot.selectionProgress).toEqual({ valid: 2, total: 5, evaluation: 'ready' });
    expect(snapshot.facts).toEqual([{ label: 'Baseline', value: '2022' }, { label: 'Energy basis', value: 'Source energy' }]);
    expect(snapshot.roster).toEqual([]);
    expect(snapshot.findings).toEqual([expect.objectContaining({ id: accountError.id, title: accountError.title, severity: 'error' })]);
  });
  it('omits valid group labels, marks incomplete setup, and shares downstream-impact wording', () => {
    const entry = facilityEntry();
    if (entry.scope !== 'facility') throw new Error('Expected facility entry');
    const account = accountEntry();
    if (account.scope !== 'account') throw new Error('Expected account entry');
    const finding = presentFinding(makeFinding('analysis-group.setup.invalid', 'error', 'readiness', {
      kind: 'analysis-group', guid: `${entry.card.analysis.guid}:invalid`, name: 'Invalid group', accountGuid: 'account-a', facilityGuid: entry.facility.guid
    }, { analysisType: 'energyIntensity', reasons: ['missingProduction'] }));
    const groups = [
      { idbGroupId: 'valid', analysisType: 'absoluteEnergyConsumption' },
      { idbGroupId: 'invalid', analysisType: 'energyIntensity' },
      { idbGroupId: 'missing-model', analysisType: 'regression' },
      { idbGroupId: 'excluded', analysisType: 'skip' }
    ] as any;
    const projected = { ...entry, card: { ...entry.card, findings: [finding], analysis: { ...entry.card.analysis, groups }, linkedAccountAnalyses: [account.card.analysis] } };
    const snapshot = analysisInventoryTile(projected, undefined, [], navigation, 'account-a').analysisSnapshot!;
    expect(snapshot.rosterTitle).toBe('Group Details');
    expect(snapshot.roster.map(row => row.state)).toEqual(['', 'Incomplete', 'Incomplete', 'Excluded']);
    expect(snapshot.usage).toBe('Changes can affect 1 account analysis.');
    expect(snapshot.findings).toEqual([expect.objectContaining({ id: finding.id, severity: 'error', title: finding.title, description: finding.description })]);
    const pending = analysisInventoryTile(projected, undefined, [], navigation, 'account-a', 'evaluating').analysisSnapshot!;
    expect(pending.findings).toEqual([]); expect(pending.roster[1].state).toBe('');
  });
  it('puts account analyses before facilities and retains attention ordering within each scope', () => {
    const entries = [facilityEntry('aaa'), accountEntry('aaa'), facilityEntry(), accountEntry()];
    const sorted = filterAnalysisInventory(entries, { ...filters, sort: 'account-first' });
    expect(sorted.map(entry => entry.key)).toEqual(['account:account-energy', 'account:aaa', 'facility:facility-a-energy', 'facility:aaa']);
    expect(entries[0].key).toBe('facility:aaa');
    expect(filterAnalysisInventory(entries, { ...filters, sort: 'attention' }).slice(0, 2).map(entry => entry.scope)).toEqual(['account', 'facility']);
    expect(filterAnalysisInventory(entries, { ...filters, sort: 'name' }).slice(0, 2).map(entry => entry.card.analysis.name)).toEqual(['aaa', 'aaa']);
  });

});

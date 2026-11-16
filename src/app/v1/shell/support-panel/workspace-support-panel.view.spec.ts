import { makeFinding } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';
import { WorkspacePanelInput, buildWorkspacePanelContent } from './workspace-support-panel.view';

const items = presentFindings([
  makeFinding('meter.currency.stale', 'warning', 'currency', { kind: 'meter', guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'facility-a' }),
  makeFinding('meter.currency.stale', 'warning', 'currency', { kind: 'meter', guid: 'meter-b', name: 'Meter B', accountGuid: 'account-a', facilityGuid: 'facility-b' }),
  makeFinding('analysis.configuration.invalid', 'error', 'configuration', { kind: 'facility-analysis', guid: 'analysis-a', name: 'Analysis', accountGuid: 'account-a', facilityGuid: 'facility-a' }),
  makeFinding('report.analysis.warning', 'warning', 'readiness', { kind: 'account-report', guid: 'report-a', name: 'Report', accountGuid: 'account-a' })
]);

function input(overrides: Partial<WorkspacePanelInput> = {}): WorkspacePanelInput {
  return { account: { name: 'Account A' }, counts: { facilities: 2, meters: 3, predictors: 0, analyses: 4, reports: 5 },
    route: { section: 'analysis', detail: 'dashboard' }, activePanelTab: 'help', accountTodos: items, discardedItems: items, ...overrides };
}

describe('workspace support-panel presentation', () => {
  it('shows account-wide findings and filters both active and discarded findings under a named facility', () => {
    expect(buildWorkspacePanelContent(input()).todos).toEqual(items);
    const content = buildWorkspacePanelContent(input({ facility: { guid: 'facility-a', name: 'Plant A' } }));
    const expected = items.filter(item => item.entity.facilityGuid === 'facility-a');
    expect(content.todos).toEqual(expected);
    expect(content.discardedWarnings).toEqual(expected);
    expect(content.help.join(' ')).toContain('Plant A');
  });

  it('keeps Data findings and counts limited to data without changing other sections', () => {
    const data = buildWorkspacePanelContent(input({ route: { section: 'data', detail: 'portfolio' } }));
    expect(data.todos.map(item => item.entity.kind)).toEqual(['meter', 'meter']);
    expect(data.discardedWarnings).toEqual(data.todos);
    expect(data.results.map(row => row.label)).toEqual(['Facilities', 'Meters', 'Predictors']);
    const analysis = buildWorkspacePanelContent(input());
    expect(analysis.todos).toEqual(items);
    expect(analysis.results.map(row => row.label)).toEqual(['Facilities', 'Meters', 'Predictors', 'Analyses', 'Reports']);
  });

  it('preserves account findings and hides the redundant facility count in a single-site workspace', () => {
    const content = buildWorkspacePanelContent(input({
      facility: { guid: 'facility-a', name: 'Plant A' }, singleFacility: { name: 'Only plant' }
    }));
    expect(content.todos).toEqual(items);
    expect(content.discardedWarnings).toEqual(items);
    expect(content.results.map(row => row.label)).not.toContain('Facilities');
    expect(content.help[0]).toContain('Only plant');
    expect(content.details[0].value).toBe('Single-facility workspace');
  });

  it('prepares zero/nonzero result tones and local tab details from explicit values', () => {
    const content = buildWorkspacePanelContent(input({ activePanelTab: 'results' }));
    expect(content.results.find(row => row.label === 'Predictors')).toMatchObject({ value: '0', tone: 'neutral' });
    expect(content.results.find(row => row.label === 'Reports')).toMatchObject({ value: '5', tone: 'success' });
    expect(content.details).toContainEqual({ label: 'Active section', value: 'analysis / dashboard' });
    expect(content.details).toContainEqual({ label: 'Support tab', value: 'results' });
  });

  it.each(['meters', 'meter-grouping'])('retains the matching facility Data help for %s', detail => {
    const content = buildWorkspacePanelContent(input({ facility: { guid: 'facility-a', name: 'Plant A' }, route: { section: 'data', detail } }));
    expect(content.help[0]).toContain(detail === 'meters' ? 'Use Meters' : 'Use Meter Grouping');
  });

  it.each([undefined, { name: 'Only plant' }])('provides visualization workbench guidance before generic workspace help (%j)', singleFacility => {
    const content = buildWorkspacePanelContent(input({ route: { section: 'visualization', detail: 'workbench' }, singleFacility }));
    const help = content.help.join(' ');
    expect(help).toContain('Settings save automatically');
    expect(help).toContain('Selected groups and facilities keep their identities');
    expect(help).not.toMatch(/matching rule|rule anchors|empty .* filter/i);
    expect(help).toContain('Portfolio periods follow the account calendar');
    expect(help).toContain('Series on the same axis');
    expect(help).toContain('Exact original periods, values and quality');
    expect(help).not.toContain('Preview');
  });

  it('keeps detailed visualization guidance out of other workspace help', () => {
    const dashboard = buildWorkspacePanelContent(input({ route: { section: 'visualization', detail: 'dashboard' }, singleFacility: { name: 'Only plant' } }));
    expect(dashboard.help[0]).toContain('Only plant');
    expect(dashboard.help.join(' ')).not.toContain('Matching rules');
  });
});

import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { StatusItem } from '@app/v1/status/status.models';
import {
  activeAccountAnalysisResultTabId,
  activeAccountAnalysisWorkbenchStageId,
  accountAnalysisWorkbenchReadiness,
  buildAccountAnalysisWorkbenchStageNavigation,
  buildAccountAnalysisWorkbenchStages,
  findingsForAccountAnalysisStage
} from './account-analysis-workbench.models';

describe('account analysis workbench models', () => {
  it('builds the four workflow stages with Results opening on Annual', () => {
    const stages = buildAccountAnalysisWorkbenchStages('account-a', 'analysis-a');

    expect(stages.map(stage => stage.label)).toEqual([
      'Setup', 'Select Facility Items', 'Results', 'Used By'
    ]);
    expect(stages[2].route).toEqual([
      '/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', 'analysis-a', 'results', 'annual'
    ]);
  });

  it('gates Select and Results independently while leaving Used By available', () => {
    const stages = buildAccountAnalysisWorkbenchStages('account-a', 'analysis-a');
    const setupFinding = finding(['missingName', 'facilitiesSelectionsInvalid']);
    const setupReadiness = accountAnalysisWorkbenchReadiness(analysis({ name: '' }), [setupFinding], true);

    expect(buildAccountAnalysisWorkbenchStageNavigation(stages, 'setup', setupReadiness, [setupFinding])
      .map(stage => ({ id: stage.id, available: stage.available, complete: stage.completed })))
      .toEqual([
        { id: 'setup', available: true, complete: false },
        { id: 'select-items', available: false, complete: false },
        { id: 'results', available: false, complete: false },
        { id: 'used-by', available: true, complete: false }
      ]);

    const selectionFinding = finding(['facilitiesSelectionsInvalid']);
    const selectionReadiness = accountAnalysisWorkbenchReadiness(analysis(), [selectionFinding], true);
    const selectionStages = buildAccountAnalysisWorkbenchStageNavigation(
      stages, 'select-items', selectionReadiness, [selectionFinding]
    );
    expect(selectionStages.find(stage => stage.id === 'select-items')).toMatchObject({
      available: true,
      completed: false,
      hasBlockingErrors: true
    });
    expect(selectionStages.find(stage => stage.id === 'results')?.available).toBe(false);

    const completeReadiness = accountAnalysisWorkbenchReadiness(analysis(), [], true);
    expect(buildAccountAnalysisWorkbenchStageNavigation(stages, 'results', completeReadiness, [])
      .filter(stage => stage.id === 'setup' || stage.id === 'select-items')
      .every(stage => stage.completed)).toBe(true);
    expect(buildAccountAnalysisWorkbenchStageNavigation(stages, 'results', completeReadiness, [])
      .find(stage => stage.id === 'results')?.available).toBe(true);
  });

  it('keeps warnings non-blocking and assigns them to Select Facility Items', () => {
    const warning = finding([], 'account-analysis.children.warning', 'warning');
    const readiness = accountAnalysisWorkbenchReadiness(analysis(), [warning], true);
    const selectFindings = findingsForAccountAnalysisStage('select-items', [warning]);

    expect(readiness.selectionsComplete).toBe(true);
    expect(selectFindings).toEqual([warning]);
    expect(buildAccountAnalysisWorkbenchStageNavigation(
      buildAccountAnalysisWorkbenchStages('account-a', 'analysis-a'),
      'select-items',
      readiness,
      [warning]
    ).find(stage => stage.id === 'select-items')).toMatchObject({
      available: true,
      completed: true,
      hasBlockingErrors: false,
      attention: { warningCount: 1 }
    });
  });

  it('keeps Results locked when the facility projection contains an unassigned current facility', () => {
    const readiness = accountAnalysisWorkbenchReadiness(analysis(), [], true, false);

    expect(readiness).toMatchObject({ setupComplete: true, selectionsComplete: false });
    expect(buildAccountAnalysisWorkbenchStageNavigation(
      buildAccountAnalysisWorkbenchStages('account-a', 'analysis-a'),
      'select-items',
      readiness,
      []
    ).find(stage => stage.id === 'results')?.available).toBe(false);
  });

  it('parses primary and Results navigation from canonical URLs', () => {
    expect(activeAccountAnalysisWorkbenchStageId('/v1/workspace/account/a/analysis/workbench/x/setup')).toBe('setup');
    expect(activeAccountAnalysisWorkbenchStageId('/v1/workspace/account/a/analysis/workbench/x/select-items')).toBe('select-items');
    expect(activeAccountAnalysisWorkbenchStageId('/v1/workspace/account/a/analysis/workbench/x/results/monthly-chart')).toBe('results');
    expect(activeAccountAnalysisWorkbenchStageId('/v1/workspace/account/a/analysis/workbench/x/used-by')).toBe('used-by');
    expect(activeAccountAnalysisResultTabId('/v1/workspace/account/a/analysis/workbench/x/results/facility-details')).toBe('facility-details');
    expect(activeAccountAnalysisResultTabId('/v1/workspace/account/a/analysis/workbench/x/results/facility-contributions')).toBe('facility-contributions');
    expect(activeAccountAnalysisResultTabId('/v1/workspace/account/a/analysis/workbench/x/setup')).toBe('annual');
  });
});

function analysis(overrides: Partial<IdbAccountAnalysisItem> = {}): IdbAccountAnalysisItem {
  return {
    guid: 'analysis-a',
    accountId: 'account-a',
    name: 'Portfolio energy',
    baselineYear: 2020,
    analysisCategory: 'energy',
    energyIsSource: false,
    energyUnit: 'MMBtu',
    waterUnit: 'gal',
    facilityAnalysisItems: [],
    hasBanking: false,
    isAnalysisVisited: false,
    createdDate: new Date(),
    modifiedDate: new Date(),
    ...overrides
  };
}

function finding(
  reasons: readonly string[],
  code: StatusItem['code'] = 'account-analysis.configuration.invalid',
  severity: StatusItem['severity'] = 'error'
): StatusItem {
  return {
    id: `${code}:analysis-a`,
    code,
    severity,
    category: code === 'account-analysis.children.warning' ? 'quality' : 'configuration',
    entity: { kind: 'account-analysis', guid: 'analysis-a', name: 'Portfolio energy', accountGuid: 'account-a' },
    evidence: reasons.length ? { reasons } : {},
    title: 'Review account analysis',
    description: 'Review the selected account analysis.',
    todo: true,
    destination: { kind: 'account-analysis', accountGuid: 'account-a', analysisGuid: 'analysis-a' }
  };
}

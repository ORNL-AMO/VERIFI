import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { StatusItem } from '@app/v1/status/status.models';
import { activeAnalysisWorkbenchStageId, buildAnalysisWorkbenchStages, stageHasBlockingErrors, tabsForAnalysisGroup } from './facility-analysis-workbench.models';

describe('facility analysis workbench models', () => {
  const regression = { idbGroupId: 'group-b', analysisType: 'regression' } as AnalysisGroup;
  const skipped = { idbGroupId: 'group-a', analysisType: 'skip' } as AnalysisGroup;
  const analysis = { guid: 'analysis-a', groups: [skipped, regression] } as IdbAnalysisItem;
  const meterGroups = [
    { guid: 'group-a', name: 'First group' },
    { guid: 'group-b', name: 'Second group' }
  ] as IdbUtilityMeterGroup[];

  it('builds stages in the persisted analysis-group order', () => {
    const stages = buildAnalysisWorkbenchStages('facility-a', analysis, meterGroups);
    expect(stages.map(stage => stage.id)).toEqual(['analysis', 'group:group-a', 'group:group-b', 'facility', 'used-by']);
    expect(stages[1].route).toEqual([
      '/v1', 'workspace', 'facility', 'facility-a', 'analysis', 'workbench', 'analysis-a', 'group', 'group-a', 'setup'
    ]);
  });

  it('shows regression and results only when the group supports them', () => {
    expect(tabsForAnalysisGroup(regression).map(tab => tab.id)).toEqual(['setup', 'regression', 'annual', 'monthly']);
    expect(tabsForAnalysisGroup(skipped).map(tab => tab.id)).toEqual(['setup']);
  });

  it('resolves a workflow stage from every canonical route family', () => {
    expect(activeAnalysisWorkbenchStageId('/v1/workspace/facility/f/analysis/workbench/a/setup')).toBe('analysis');
    expect(activeAnalysisWorkbenchStageId('/v1/workspace/facility/f/analysis/workbench/a/group/group%20a/monthly')).toBe('group:group a');
    expect(activeAnalysisWorkbenchStageId('/v1/workspace/facility/f/analysis/workbench/a/facility/annual')).toBe('facility');
    expect(activeAnalysisWorkbenchStageId('/v1/workspace/facility/f/analysis/workbench/a/used-by')).toBe('used-by');
  });

  it('blocks progression only for errors owned by the current stage', () => {
    const stages = buildAnalysisWorkbenchStages('facility-a', analysis, meterGroups);
    const analysisError = finding('facility-analysis', 'analysis-a');
    const secondGroupError = finding('analysis-group', 'analysis-a:group-b');
    const warning = { ...finding('analysis-group', 'analysis-a:group-a'), severity: 'warning' as const };

    expect(stageHasBlockingErrors(stages[0], analysis.guid, [secondGroupError])).toBe(false);
    expect(stageHasBlockingErrors(stages[0], analysis.guid, [analysisError])).toBe(true);
    expect(stageHasBlockingErrors(stages[1], analysis.guid, [warning, secondGroupError])).toBe(false);
    expect(stageHasBlockingErrors(stages[2], analysis.guid, [secondGroupError])).toBe(true);
    expect(stageHasBlockingErrors(stages[3], analysis.guid, [secondGroupError])).toBe(true);
    expect(stageHasBlockingErrors(stages[4], analysis.guid, [analysisError, secondGroupError])).toBe(false);
  });
});

function finding(kind: 'facility-analysis' | 'analysis-group', guid: string): StatusItem {
  return {
    id: `${kind}:${guid}`,
    code: kind === 'facility-analysis' ? 'analysis.configuration.invalid' : 'analysis-group.model.invalid',
    severity: 'error',
    category: 'configuration',
    entity: { kind, guid, name: 'Analysis', accountGuid: 'account-a', facilityGuid: 'facility-a' },
    evidence: {}, title: 'Fix setup', description: 'Fix setup.', todo: true,
    destination: { kind: 'unavailable' }
  };
}

import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { activeAnalysisWorkbenchStageId, buildAnalysisWorkbenchStages, tabsForAnalysisGroup } from './facility-analysis-workbench.models';

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
});

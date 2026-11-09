import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getAnalysisGroupChanges, getFacilityAnalysisFieldChanges } from './analysis-edits';

describe('facility analysis edit capture', () => {
  const group = {
    idbGroupId: 'group-a', regressionConstant: 10, regressionModelNotes: 'original',
    predictorVariables: [{ id: 'predictor-a', name: 'Production', productionInAnalysis: true, regressionCoefficient: 2 }],
    dataAdjustments: [{ year: 2024, amount: 5 }]
  } as AnalysisGroup;

  it('captures only changed setup fields so queued edits preserve the other settings', () => {
    const before = { name: 'original', energyUnit: 'MMBtu', groups: [group] } as IdbAnalysisItem;
    expect(getFacilityAnalysisFieldChanges(before, { name: 'edited', energyUnit: 'MMBtu' })).toEqual({ name: 'edited' });
  });

  it('captures a note edit without replacing coefficients, predictor metadata, or adjustments', () => {
    const changes = getAnalysisGroupChanges(group, { ...group, regressionModelNotes: 'edited' });
    expect(changes).toEqual({ regressionModelNotes: 'edited' });
  });

  it('captures changed predictor values by GUID and preserves explicit resets', () => {
    const changes = getAnalysisGroupChanges(group, {
      ...group,
      regressionConstant: undefined,
      predictorVariables: [{ ...group.predictorVariables[0], regressionCoefficient: undefined }]
    });
    expect(changes).toEqual({
      regressionConstant: undefined,
      predictorVariables: [{ id: 'predictor-a', regressionCoefficient: undefined }]
    });
    expect(group.regressionConstant).toBe(10);
    expect(group.predictorVariables[0].regressionCoefficient).toBe(2);
  });

  it('owns captured nested edits rather than retaining a mutable form array', () => {
    const after = { dataAdjustments: [{ year: 2024, amount: 7 }] };
    const changes = getAnalysisGroupChanges(group, after);
    after.dataAdjustments[0].amount = 99;
    expect(changes.dataAdjustments).toEqual([{ year: 2024, amount: 7 }]);
  });
});

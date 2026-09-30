import { stepsForDraft } from './import-workflow.config';

describe('import workflow configuration', () => {
  it('keeps the branch-specific guided step sequences', () => {
    expect(stepsForDraft({ kind: 'verifi-v3' } as any).map(step => step.id)).toEqual([
      'facilities', 'meters', 'meter-readings', 'predictors', 'predictor-readings', 'review'
    ]);
    expect(stepsForDraft({ kind: 'general-workbook' } as any).map(step => step.id)).toEqual([
      'worksheet', 'columns', 'map-meters', 'meters', 'meter-readings',
      'map-predictors', 'predictors', 'predictor-readings', 'review'
    ]);
    expect(stepsForDraft({ kind: 'footprint-tool' } as any).map(step => step.id)).toEqual([
      'facility', 'equipment', 'review'
    ]);
  });
});

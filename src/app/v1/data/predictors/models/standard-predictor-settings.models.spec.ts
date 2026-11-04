import { IdbPredictor } from '@data/models/idbModels/predictor';
import { applyStandardPredictorSettings, normalizeStandardPredictorSettings, reconcileStandardPredictorSettings,
  standardPredictorSettings } from './standard-predictor-settings.models';

describe('Standard predictor settings', () => {
  const predictor = { guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production',
    unit: 'tons', production: true, predictorType: 'Standard', referencePredictorId: 'retained' } as IdbPredictor;

  it('normalizes optional text and ignores a hidden stop month', () => {
    const value = normalizeStandardPredictorSettings({ ...standardPredictorSettings(predictor), name: ' Production ',
      unit: ' ', description: ' ', stopMonth: '2026-02', noLongerInUse: false });
    expect(value).toMatchObject({ name: 'Production', unit: '', description: '', stopMonth: '' });
    const updated = applyStandardPredictorSettings(predictor, value);
    expect(updated).toMatchObject({ unit: undefined, description: undefined, noLongerInUseMonth: undefined, referencePredictorId: 'retained' });
    expect(predictor.unit).toBe('tons');
  });

  it('merges unrelated fields and treats inactive status and stop month as one conflict group', () => {
    const base = standardPredictorSettings(predictor);
    const merged = reconcileStandardPredictorSettings(base, { ...base, name: 'Local' }, { ...base, description: 'Saved' });
    expect(merged.value).toMatchObject({ name: 'Local', description: 'Saved' });
    expect(merged.conflicts).toEqual([]);
    const local = { ...base, noLongerInUse: true, stopMonth: '2026-02' };
    const saved = { ...base, noLongerInUse: true, stopMonth: '2026-03' };
    expect(reconcileStandardPredictorSettings(base, local, saved).conflicts.map(conflict => conflict.id)).toEqual(['stopDate']);
    expect(reconcileStandardPredictorSettings(base, local, saved, { stopDate: 'saved' }).value).toEqual(saved);
  });
});

import { JStatRegressionModel } from '@data/models/analysis';
import { RegressionCandidateStore } from './regression-candidate.store';

describe('RegressionCandidateStore', () => {
  it('isolates generated candidates by analysis and group', () => {
    const store = new RegressionCandidateStore();
    const first = { modelId: 'first' } as JStatRegressionModel;
    const second = { modelId: 'second' } as JStatRegressionModel;

    store.set('analysis-a', 'shared-group', [first]);
    store.set('analysis-b', 'shared-group', [second]);

    expect(store.modelsFor('analysis-a', 'shared-group')).toEqual([first]);
    expect(store.modelsFor('analysis-b', 'shared-group')).toEqual([second]);
  });

  it('does not expose mutable model references', () => {
    const store = new RegressionCandidateStore();
    const model = { modelId: 'model-1', coef: [1] } as JStatRegressionModel;

    store.set('analysis-a', 'group-a', [model]);
    model.coef[0] = 99;

    expect(store.modelsFor('analysis-a', 'group-a')[0].coef[0]).toBe(1);
  });
});

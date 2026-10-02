import { getCombinedCalculationState } from './account-home.service';

describe('getCombinedCalculationState', () => {
  it('keeps a card loading while either its analysis or shared overview is loading', () => {
    expect(getCombinedCalculationState(true, false)).toBe('loading');
    expect(getCombinedCalculationState(false, true)).toBe('loading');
    expect(getCombinedCalculationState('error', true)).toBe('loading');
  });

  it('reports ready only after both jobs finish and otherwise reports an error', () => {
    expect(getCombinedCalculationState(false, false)).toBe('ready');
    expect(getCombinedCalculationState('error', false)).toBe('error');
    expect(getCombinedCalculationState(false, 'error')).toBe('error');
  });
});

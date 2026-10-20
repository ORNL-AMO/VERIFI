import { IdbPredictor, isStandardPredictor } from './predictor';

describe('legacy standard Predictor compatibility', () => {
  it.each([undefined, null, '', '  ', 'Standard'])('recognizes an absent or Standard type (%s)', type => {
    expect(isStandardPredictor({ predictorType: type } as unknown as IdbPredictor)).toBe(true);
  });
  it.each(['Weather', 'Conversion', 'Math', 'Unknown', 0, false, {}])('preserves an explicit unsupported/nonstandard type (%s)', type => {
    expect(isStandardPredictor({ predictorType: type } as unknown as IdbPredictor)).toBe(false);
  });
});

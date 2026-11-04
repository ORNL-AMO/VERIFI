import { getPptAxisSpec } from './ppt-slide';
import { getPptAxisSpec as neutralAxis } from '@shared/report-output/ppt-slide';

describe('legacy PowerPoint model compatibility', () => {
  it('re-exports the neutral axis helper through the existing v0 entrypoint', () => {
    expect(getPptAxisSpec).toBe(neutralAxis);
  });
});

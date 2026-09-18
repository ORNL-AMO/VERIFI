import { getNewIdbAccount } from './account';

describe('IdbAccount defaults', () => {
  it('starts new accounts with no discarded status warnings', () => {
    expect(getNewIdbAccount().statusWarningDismissals).toEqual([]);
  });
});

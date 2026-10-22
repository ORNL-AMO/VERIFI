import { facilityContextBreadcrumbs } from './facility-context-breadcrumbs';

describe('facility context breadcrumbs', () => {
  const account = { label: 'Company', route: ['/account', 'data'] };

  it('makes the sole facility the dashboard root without a redundant account level', () => {
    expect(facilityContextBreadcrumbs(true, account, { label: 'Plant' })).toEqual([{ label: 'Plant' }]);
  });

  it.each(['meters', 'meter-grouping', 'predictors', 'analysis'])('preserves the facility %s inventory return from a workbench', detail => {
    const facility = { label: 'Plant', route: ['/facility', detail] };
    expect(facilityContextBreadcrumbs(true, account, facility)).toEqual([facility]);
  });

  it('preserves the portfolio account return destination and facility root', () => {
    const facility = { label: 'Plant', route: ['/facility', 'predictors'] };
    expect(facilityContextBreadcrumbs(false, account, facility)).toEqual([account, facility]);
  });
});

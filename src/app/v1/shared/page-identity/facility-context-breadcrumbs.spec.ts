import { facilityContextBreadcrumbs } from './facility-context-breadcrumbs';

describe('facility context breadcrumbs', () => {
  const account = { label: 'Company', route: ['/account', 'data'] };
  const facility = { label: 'Plant', route: ['/facility', 'data'] };
  it.each(['meters', 'predictors', 'analysis', 'reports'])('uses the %s resource as the single-site return ancestor', resource => {
    const inventory = { label: resource, route: ['/account', resource] };
    expect(facilityContextBreadcrumbs(true, account, facility, inventory)).toEqual([inventory]);
  });
  it('preserves portfolio account and owning-facility ancestors with their context icons', () => {
    expect(facilityContextBreadcrumbs(false, account, facility, { label: 'Meters' })).toEqual([
      { ...account, icon: 'account' }, { ...facility, icon: 'facility' }
    ]);
  });
});

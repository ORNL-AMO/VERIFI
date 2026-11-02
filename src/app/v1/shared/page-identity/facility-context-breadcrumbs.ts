import type { PageBreadcrumb } from './page-identity.component';

/** A single-facility workspace returns through its resource inventory. */
export function facilityContextBreadcrumbs(
  singleSite: boolean,
  account: PageBreadcrumb,
  facility: PageBreadcrumb,
  resource: PageBreadcrumb
): readonly PageBreadcrumb[] {
  return singleSite ? [resource] : [account, facility];
}

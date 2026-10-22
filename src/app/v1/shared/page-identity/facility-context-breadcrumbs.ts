import type { PageBreadcrumb } from './page-identity.component';

/** Keep the facility as the root for single-site workspaces. */
export function facilityContextBreadcrumbs(
  singleSite: boolean,
  account: PageBreadcrumb,
  facility: PageBreadcrumb
): readonly PageBreadcrumb[] {
  return singleSite ? [facility] : [account, facility];
}

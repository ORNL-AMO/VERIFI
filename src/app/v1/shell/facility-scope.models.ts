export type FacilityScope =
  | { readonly kind: 'all' }
  | { readonly kind: 'facility'; readonly facilityGuid: string };

export const ALL_FACILITIES: FacilityScope = { kind: 'all' };

export function facilityScopeQuery(scope: FacilityScope): { facility?: string } {
  return scope.kind === 'facility' ? { facility: scope.facilityGuid } : {};
}

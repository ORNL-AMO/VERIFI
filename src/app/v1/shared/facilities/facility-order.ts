import { IdbFacility } from '@data/models/idbModels/facility';

export function orderFacilities(facilities: readonly IdbFacility[], order?: readonly string[]): IdbFacility[] {
  if (!Array.isArray(order))
    return [...facilities];

  const remaining = new Map(facilities.map(facility => [facility.guid, facility]));
  const ordered: IdbFacility[] = [];

  for (const guid of order) {
    const facility = remaining.get(guid);
    if (facility) {
      ordered.push(facility);
      remaining.delete(guid);
    }
  }

  return [...ordered, ...remaining.values()];
}


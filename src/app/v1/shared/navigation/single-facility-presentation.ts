import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';

/** Presentation never guesses an owner from remembered selection or an invalid workspace. */
export function singleFacilityPresentation(account: IdbAccount | undefined, facilities: readonly IdbFacility[], ready: boolean): IdbFacility | undefined {
  if (!ready || account?.isSingleFacilityCompany !== true) return undefined;
  const owned = facilities.filter(facility => facility.accountId === account.guid);
  return owned.length === 1 ? owned[0] : undefined;
}

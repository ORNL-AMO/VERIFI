import { IdbFacility } from 'src/app/models/idbModels/facility';

export function getFacilityDataManagementUrl(
  accountGuid: string,
  selectedFacility: IdbFacility | undefined
): string {
  return selectedFacility
    ? `/data-management/${accountGuid}/facilities/${selectedFacility.guid}`
    : `/data-management/${accountGuid}`;
}

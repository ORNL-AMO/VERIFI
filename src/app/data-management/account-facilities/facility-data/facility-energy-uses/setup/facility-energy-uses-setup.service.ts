import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FacilityEnergyUsesSetupService {

  setupYear: number;
  newGroups: Array<{
    groupName: string,
    numberOfEquipment: number,
    operatingHours: number,
    guid: string
  }>;

  existingGroupsToEdit: Array<string>;
  constructor() { }
}

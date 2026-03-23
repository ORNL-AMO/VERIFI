import { Component } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { Subscription } from 'rxjs';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getGUID } from 'src/app/shared/sharedHelperFunctions';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { FacilityEnergyUsesSetupService } from '../../facility-energy-uses-setup.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-new-equipment-group-setup-options',
  standalone: false,
  templateUrl: './new-equipment-group-setup-options.component.html',
  styleUrl: './new-equipment-group-setup-options.component.css',
})
export class NewEquipmentGroupSetupOptionsComponent {
  facility: IdbFacility;
  facilitySub: Subscription;

  facilityEnergyUseGroups: Array<{
    guid: string,
    name: string,
    selected: boolean
  }>;
  facilityEnergyUseGroupsSub: Subscription;

  numberOfGroups: number = 1;
  setupYear: number;
  newGroups: Array<{
    groupName: string,
    numberOfEquipment: number,
    operatingHours: number,
    guid: string
  }> = [{
    groupName: 'Group 1',
    numberOfEquipment: 1,
    operatingHours: 8760,
    guid: getGUID()
  }];
  yearOptions: Array<number>;

  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityEnergyUsesSetupService: FacilityEnergyUsesSetupService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
      this.setYearOptions();
    });
    this.facilityEnergyUseGroupsSub = this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.subscribe(groups => {
      this.facilityEnergyUseGroups = groups.map(group => {
        return {
          guid: group.guid,
          name: group.name,
          selected: true
        }
      });
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.facilityEnergyUseGroupsSub.unsubscribe();
  }

  setYearOptions() {
    this.yearOptions = new Array();
    let facilityMeterDataYears: { endYear: number, startYear: number } = this.utilityMeterDataDbService.getStartEndYearsForFacility(this.facility.guid);
    for (let year = facilityMeterDataYears.startYear; year <= facilityMeterDataYears.endYear; year++) {
      this.yearOptions.push(year);
    }
    if (!this.setupYear) {
      this.setupYear = facilityMeterDataYears.endYear;
    }
  }

  setNewGroups() {
    if (this.numberOfGroups < this.newGroups.length) {
      this.newGroups = this.newGroups.slice(0, this.numberOfGroups);
    } else {
      for (let i = this.newGroups.length; i < this.numberOfGroups; i++) {
        this.newGroups.push({
          groupName: 'Group ' + (i + 1),
          numberOfEquipment: 1,
          operatingHours: 8760,
          guid: getGUID()
        });
      }
    }
  }

  goToEquipmentDetails() {
    this.facilityEnergyUsesSetupService.setupYear = this.setupYear;
    this.facilityEnergyUsesSetupService.newGroups = this.newGroups;
    this.router.navigate(['../../new-setup'], { relativeTo: this.route });
  }

  addNewGroup() {
    this.numberOfGroups++;
    this.setNewGroups();
  }

  removeNewGroup() {
    if (this.numberOfGroups > 1) {
      this.numberOfGroups--;
      this.setNewGroups();
    }
  }

  addEquipment(group: { groupName: string, numberOfEquipment: number, operatingHours: number, guid: string }) {
    group.numberOfEquipment++;
  }

  removeEquipment(group: { groupName: string, numberOfEquipment: number, operatingHours: number, guid: string }) {
    if (group.numberOfEquipment > 1) {
      group.numberOfEquipment--;
    }
  }
}

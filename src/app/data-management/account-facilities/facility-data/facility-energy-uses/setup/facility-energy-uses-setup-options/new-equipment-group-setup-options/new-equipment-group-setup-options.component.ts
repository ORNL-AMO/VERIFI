import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, computed, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getGUID } from 'src/app/shared/sharedHelperFunctions';
import { FacilityEnergyUsesSetupService } from '../../facility-energy-uses-setup.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-new-equipment-group-setup-options',
  standalone: false,
  templateUrl: './new-equipment-group-setup-options.component.html',
  styleUrl: './new-equipment-group-setup-options.component.css',
})
export class NewEquipmentGroupSetupOptionsComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
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

  constructor(
    private router: Router,
    private facilityEnergyUsesSetupService: FacilityEnergyUsesSetupService,
    private route: ActivatedRoute,
    private injector: Injector

  ) { }

  ngOnInit() {
    this.facilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
      this.facility = facility;
      this.setYearOptions();
    });
    this.facilityEnergyUseGroupsSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityEnergyUseGroups()]), { injector: this.injector }).subscribe(groups => {
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
    let facilityMeterDataYears: { endYear: number, startYear: number } = this.accountWorkspaceQuery.getFacilityMeterDataYears(this.facility.guid);
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

  leaveGroupSetup() {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }
}

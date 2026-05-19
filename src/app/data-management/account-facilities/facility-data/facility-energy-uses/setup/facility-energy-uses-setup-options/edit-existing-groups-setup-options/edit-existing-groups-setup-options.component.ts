import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityEnergyUsesSetupService } from '../../facility-energy-uses-setup.service';

@Component({
  selector: 'app-edit-existing-groups-setup-options',
  standalone: false,
  templateUrl: './edit-existing-groups-setup-options.component.html',
  styleUrl: './edit-existing-groups-setup-options.component.css',
})
export class EditExistingGroupsSetupOptionsComponent {

  facility: IdbFacility;
  facilitySub: Subscription;

  facilityEnergyUseGroups: Array<{
    guid: string,
    name: string,
    selected: boolean
  }>;
  facilityEnergyUseGroupsSub: Subscription;

  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private router: Router,
    private facilityEnergyUsesSetupService: FacilityEnergyUsesSetupService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
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
    this.facilityEnergyUseGroupsSub.unsubscribe();
    this.facilitySub.unsubscribe();
  }

  toggleGroupSelection(group: { guid: string, name: string, selected: boolean }) {
    group.selected = !group.selected;
  }

  goToEquipmentDetails() {
    this.facilityEnergyUsesSetupService.existingGroupsToEdit = this.facilityEnergyUseGroups.filter(group => group.selected).map(group => group.guid);
    this.router.navigate(['../../edit-existing'], { relativeTo: this.route });
  }

  leaveGroupSetup() {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }
}

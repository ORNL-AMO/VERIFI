import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityEnergyUsesSetupService } from '../facility-energy-uses-setup.service';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import * as _ from 'lodash';

@Component({
  selector: 'app-facility-energy-uses-modify-annual-data',
  standalone: false,
  templateUrl: './facility-energy-uses-modify-annual-data.component.html',
  styleUrl: './facility-energy-uses-modify-annual-data.component.css',
})
export class FacilityEnergyUsesModifyAnnualDataComponent {

  selectedYear: number;
  facility: IdbFacility;
  facilitySub: Subscription;

  energyUseGroups: Array<IdbFacilityEnergyUseGroup & { equipment: Array<IdbFacilityEnergyUseEquipment> }>;
  groupSetupIndex: number = 0;

  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private activatedRoute: ActivatedRoute,
    private facilityEnergyUsesSetupService: FacilityEnergyUsesSetupService,
    private router: Router) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      this.selectedYear = parseInt(params['year']);
      console.log('selected year: ', this.selectedYear);
    });
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.initEnergyUseGroups();
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
  }

  initEnergyUseGroups() {
    this.groupSetupIndex = 0;
    this.energyUseGroups = new Array();
    if (this.facilityEnergyUsesSetupService.existingGroupsToEdit) {
      //Add year here instead of in setup component?
      
      let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.facilityEnergyUseGroupsDbService.getByFacilityId(this.facility.guid);
      let equipment: Array<IdbFacilityEnergyUseEquipment> = this.facilityEnergyUseEquipmentDbService.getByFacilityId(this.facility.guid);
      this.facilityEnergyUsesSetupService.existingGroupsToEdit.forEach(groupId => {
        let group: IdbFacilityEnergyUseGroup = facilityEnergyUseGroups.find(group => group.guid == groupId);
        if (group) {
          let groupCopy: IdbFacilityEnergyUseGroup = _.cloneDeep(group);
          let equipmentForGroup: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.energyUseGroupId == group.guid);
          this.energyUseGroups.push({
            ...groupCopy,
            equipment: equipmentForGroup.map(equip => { return _.cloneDeep(equip); })
          });
        }
      });

    } else {
      console.log('no setup info, going back to options');
      this.router.navigate(['../../setup-options'], { relativeTo: this.activatedRoute });
    }
  }

  previousGroup() {
    if (this.groupSetupIndex > 0) {
      this.groupSetupIndex--;
    }
  }

  nextGroup() {
    if (this.groupSetupIndex < this.energyUseGroups.length - 1) {
      this.groupSetupIndex++;
    }
  }

  finalizeSetup() {

  }

  leaveGroupSetup() {

  }
}

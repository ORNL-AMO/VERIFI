import { Component } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { Subscription } from 'rxjs';
import { EnergyUsesGroupSummary } from 'src/app/calculations/energy-footprint/energyUsesGroupSummary';

@Component({
  selector: 'app-facility-energy-uses-group-summary',
  standalone: false,
  templateUrl: './facility-energy-uses-group-summary.component.html',
  styleUrl: './facility-energy-uses-group-summary.component.css'
})
export class FacilityEnergyUsesGroupSummaryComponent {

  facilityEnergyUseEquipmentSub: Subscription;
  facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>;
  energyUsesGroupSummary: EnergyUsesGroupSummary;
  energyUseGroup: IdbFacilityEnergyUseGroup;
  facility: IdbFacility;
  facilitySub: Subscription;
  constructor(private activatedRoute: ActivatedRoute,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService
  ) {
  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.facilityEnergyUseEquipmentSub = this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment.subscribe(equipment => {
      this.facilityEnergyUseEquipment = equipment;
    });
    this.activatedRoute.params.subscribe(params => {
      let groupId: string = params['id'];
      this.energyUseGroup = this.facilityEnergyUseGroupsDbService.getByGuid(groupId);
      if (this.energyUseGroup) {
        this.setEnergyFootprintGroup();
      } else {
        this.goToGroupList();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.facilityEnergyUseEquipmentSub.unsubscribe();
  }

  goToGroupList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses');
  }

  setEnergyFootprintGroup() {
    this.energyUsesGroupSummary = new EnergyUsesGroupSummary(this.energyUseGroup, this.facilityEnergyUseEquipment, this.facility);
  }

  goToEquipment(equipmentGuid: string) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses/' + this.energyUseGroup.guid + '/equipment/' + equipmentGuid);
  }
}

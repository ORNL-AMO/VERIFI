import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { EnergyFootprintFacility } from 'src/app/calculations/energy-footprint/energyFootprintFacility';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

@Component({
  selector: 'app-facility-energy-uses-summary',
  standalone: false,
  templateUrl: './facility-energy-uses-summary.component.html',
  styleUrl: './facility-energy-uses-summary.component.css'
})
export class FacilityEnergyUsesSummaryComponent {

  facility: IdbFacility;
  facilitySub: Subscription;

  facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup>;
  facilityEnergyUseGroupsSub: Subscription;

  facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>;
  facilityEnergyUseEquipmentSub: Subscription;

  energyFootprintFacility: EnergyFootprintFacility;

  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService
  ) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.facilityEnergyUseGroupsSub = this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.subscribe(groups => {
      this.facilityEnergyUseGroups = groups;
    });
    // this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
    //   this.itemsPerPage = val;
    // });
    this.facilityEnergyUseEquipmentSub = this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment.subscribe(equipment => {
      this.facilityEnergyUseEquipment = equipment;
      this.setEnergyFootprintFacility();
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.facilityEnergyUseGroupsSub.unsubscribe();
    this.facilityEnergyUseEquipmentSub.unsubscribe();
  }

  setEnergyFootprintFacility() {
    this.energyFootprintFacility = new EnergyFootprintFacility(this.facility, this.facilityEnergyUseGroups, this.facilityEnergyUseEquipment);
    console.log(this.energyFootprintFacility)
  }
}

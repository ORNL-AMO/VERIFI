import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { EnergyFootprintFacility } from 'src/app/calculations/energy-footprint/energyFootprintFacility';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

@Component({
  selector: 'app-facility-energy-uses-footprint',
  standalone: false,
  templateUrl: './facility-energy-uses-footprint.component.html',
  styleUrl: './facility-energy-uses-footprint.component.css',
})
export class FacilityEnergyUsesFootprintComponent {

  facility: IdbFacility;
  facilitySub: Subscription;

  facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup>;
  facilityEnergyUseGroupsSub: Subscription;

  facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>;
  facilityEnergyUseEquipmentSub: Subscription;

  energyFootprintFacility: EnergyFootprintFacility;

  dataTypeMeterGroup: boolean = false;

  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService
  ) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.facilityEnergyUseGroupsSub = this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.subscribe(groups => {
      this.facilityEnergyUseGroups = groups;
    });
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
    if (this.facilityEnergyUseGroups?.length > 0 && this.facilityEnergyUseEquipment?.length > 0) {
      let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.facility.guid);
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(this.facility.guid);
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, this.facility, false, { energyIsSource: false, neededUnits: 'MMBtu' }, [], [], [this.facility], 'AR6', []);
      let utilityMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getFacilityGroups(this.facility.guid);
      this.energyFootprintFacility = new EnergyFootprintFacility(this.facility, this.facilityEnergyUseGroups, this.facilityEnergyUseEquipment, calanderizedMeters, utilityMeterGroups);
    }
  }

}

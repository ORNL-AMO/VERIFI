import { Component } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { Subscription } from 'rxjs';
import { EnergyFootprintGroup } from 'src/app/calculations/energy-footprint/energyFootprintGroup';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

@Component({
  selector: 'app-facility-energy-uses-group-footprint',
  standalone: false,
  templateUrl: './facility-energy-uses-group-footprint.component.html',
  styleUrl: './facility-energy-uses-group-footprint.component.css',
})
export class FacilityEnergyUsesGroupFootprintComponent {

  facilityEnergyUseEquipmentSub: Subscription;
  facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>;
  energyFootprintGroup: EnergyFootprintGroup;
  energyUseGroup: IdbFacilityEnergyUseGroup;
  facility: IdbFacility;
  facilitySub: Subscription;
  dataTypeMeterGroup: boolean = false;
  constructor(private activatedRoute: ActivatedRoute,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService
  ) {
  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
      this.setEnergyFootprintGroup();
    });
    this.facilityEnergyUseEquipmentSub = this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment.subscribe(equipment => {
      this.facilityEnergyUseEquipment = equipment;
      this.setEnergyFootprintGroup();
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
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses');
  }

  setEnergyFootprintGroup() {
    if (this.facility && this.facilityEnergyUseEquipment && this.energyUseGroup) {
      let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.facility.guid);
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(this.facility.guid);
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, this.facility, false, { energyIsSource: false, neededUnits: 'MMBtu' }, [], [], [this.facility], 'AR6', []);
      let utilityMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getFacilityGroups(this.facility.guid);
      this.energyFootprintGroup = new EnergyFootprintGroup(this.energyUseGroup, this.facilityEnergyUseEquipment, this.facility, calanderizedMeters, utilityMeterGroups);
    }
  }

  goToEquipment(equipmentGuid: string) {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses/' + this.energyUseGroup.guid + '/equipment/' + equipmentGuid);
  }

  goToFacilityFootprint() {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses/footprint');
  }
}

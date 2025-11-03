import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import { EnergyFootprintGroup } from "./energyFootprintGroup";


export class EnergyFootprintFacility {


    footprintGroups: Array<EnergyFootprintGroup> = [];
    constructor(facility: IdbFacility, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>) {
        this.setEnergyFootprintGroups(facility, energyUseGroups, equipment);
    }

    setEnergyFootprintGroups(facility: IdbFacility, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>) {
        energyUseGroups.forEach(group => {
            let groupEquipment: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.energyUseGroupId == group.guid);
            let footprintGroup: EnergyFootprintGroup = new EnergyFootprintGroup(group, groupEquipment, facility);
            this.footprintGroups.push(footprintGroup);
        });
    }
}
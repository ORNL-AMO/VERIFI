import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import * as _ from 'lodash';

export class EnergyFootprintGroup {

    groupName: string;
    groupEquipment: Array<IdbFacilityEnergyUseEquipment>;
    annualEnergyUse: Array<{ year: number, energyUse: number }> = [];

    constructor(group: IdbFacilityEnergyUseGroup, equipment: Array<IdbFacilityEnergyUseEquipment>, facility: IdbFacility) {
        this.groupName = group.name;
        this.groupEquipment = equipment.filter(equip => equip.energyUseGroupId == group.guid);

        this.setAnnualEnergyUse(facility);
    }

    setAnnualEnergyUse(facility: IdbFacility) {
        //calculate annual energy use for group based on equipment data
        let years: Array<number> = this.groupEquipment.flatMap(equip => equip.energyUseData.map(data => data.year));
        let uniqueYears: Array<number> = _.uniq(years);
        uniqueYears.forEach(year => {
            let totalEnergyUseForYear: number = 0;
            this.groupEquipment.forEach(equip => {
                let energyUseDataForYear = equip.energyUseData.find(data => data.year == year);
                if (energyUseDataForYear) {
                    //TODO: unit conversions
                    totalEnergyUseForYear += energyUseDataForYear.energyUse;
                }
            });
            this.annualEnergyUse.push({ year: year, energyUse: totalEnergyUseForYear });
        });
    }
}
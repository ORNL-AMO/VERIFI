import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import { EnergyFootprintGroup } from "./energyFootprintGroup";
import * as _ from 'lodash';

export class EnergyFootprintFacility {


    footprintGroups: Array<EnergyFootprintGroup> = [];
    footprintGroupSummaries: Array<{
        groupName: string,
        groupId: string,
        annualEnergyUse: Array<{
            totalEnergyUse: number,
            percentOfFacilityUse: number,
            year: number,
        }>
    }>;

    totals: Array<{
        year: number,
        totalEnergyUse: number,
    }>;
    constructor(facility: IdbFacility, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>) {
        this.setEnergyFootprintGroups(facility, energyUseGroups, equipment);
        this.setTotals();
        this.setFootprintGroupSummaries();
    }

    setEnergyFootprintGroups(facility: IdbFacility, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>) {
        energyUseGroups.forEach(group => {
            let groupEquipment: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.energyUseGroupId == group.guid);
            let footprintGroup: EnergyFootprintGroup = new EnergyFootprintGroup(group, groupEquipment, facility);
            this.footprintGroups.push(footprintGroup);
        });
    }

    setTotals() {
        let years: Array<number> = this.footprintGroups.map(group => group.totalAnnualEnergyUse.map(annualUse => annualUse.year)).flat();
        years = _.uniq(years);
        this.totals = years.map(year => {
            let totalEnergyUse: number = 0;
            this.footprintGroups.forEach(group => {
                let yearData = group.totalAnnualEnergyUse.find(annualUse => annualUse.year == year);
                if (yearData) {
                    totalEnergyUse += yearData.energyUse;
                }
            });
            return {
                year: year,
                totalEnergyUse: totalEnergyUse
            }
        });
    }
    setFootprintGroupSummaries() {
        this.footprintGroupSummaries = this.footprintGroups.map(group => {
            let annualEnergyUse = this.totals.map(total => {
                let groupYearData = group.totalAnnualEnergyUse.find(annualUse => annualUse.year == total.year);
                let groupEnergyUse = groupYearData ? groupYearData.energyUse : 0;
                let percentOfFacilityUse = total.totalEnergyUse > 0 ? (groupEnergyUse / total.totalEnergyUse) * 100 : 0;
                return {
                    totalEnergyUse: groupEnergyUse,
                    percentOfFacilityUse: percentOfFacilityUse,
                    year: total.year
                }
            });
            return {
                groupName: group.groupName,
                groupId: group.groupId,
                annualEnergyUse: annualEnergyUse
            }
        });
    }
}
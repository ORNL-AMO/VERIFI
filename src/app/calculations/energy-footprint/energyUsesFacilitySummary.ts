import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import * as _ from 'lodash';
import { EnergyUsesGroupSummary } from "./energyUsesGroupSummary";

export class EnergyUsesFacilitySummary {
    footprintGroups: Array<EnergyUsesGroupSummary> = [];
    totals: Array<{
        year: number,
        totalEnergyUse: number,
        isPropegated: boolean
    }>;
    constructor(facility: IdbFacility, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>, useLatestDataAvailable: boolean = true) {
        this.setEnergyFootprintGroups(facility, energyUseGroups, equipment, useLatestDataAvailable);
        this.setTotals();
        this.setFootprintGroupSummaries();
        this.orderResults();
    }

    setEnergyFootprintGroups(facility: IdbFacility, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>, useLatestDataAvailable: boolean) {
        energyUseGroups.forEach(group => {
            let groupEquipment: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.energyUseGroupId == group.guid);
            let footprintGroup: EnergyUsesGroupSummary = new EnergyUsesGroupSummary(group, groupEquipment, facility);
            this.footprintGroups.push(footprintGroup);
        });
        if (useLatestDataAvailable) {
            let years: Array<number> = this.footprintGroups.map(group => group.totalAnnualEnergyUse.map(annualUse => annualUse.year)).flat();
            years = _.uniq(years);
            // let mostRecentYear: number = Math.max(...years);
            //iterate groups. If data missing for most recent year, set to closest year with data
            years.forEach(year => {
                this.footprintGroups.forEach(group => {
                    group.checkIfYearIncluded(year);
                });
            });
            // this.footprintGroups.forEach(group => {
            //     group.checkIfYearIncluded(mostRecentYear);
            // });
        }
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
                totalEnergyUse: totalEnergyUse,
                isPropegated: this.footprintGroups.some(group => {
                    let yearData = group.totalAnnualEnergyUse.find(annualUse => annualUse.year == year);
                    return yearData ? yearData.isPropegated : false;
                })
            }
        });
    }
    setFootprintGroupSummaries() {
        this.footprintGroups.forEach(group => {
            group.setPercentOfFacilityUse(this.totals);
        });
    }

    orderResults() {
        this.footprintGroups.forEach(groupSummary => {
            groupSummary.totalAnnualEnergyUse = _.orderBy(groupSummary.totalAnnualEnergyUse, ['year'], ['asc'])
        });
        this.totals = _.orderBy(this.totals, ['year'], ['asc']);
    }

    filterHistory(): EnergyUsesFacilitySummary {
        this.footprintGroups = this.footprintGroups.map(group => group.filterHistory());
        //TODO - check if we need to aggregate from latest year of data
        this.setTotals();
        this.setFootprintGroupSummaries();
        return this;
    }
}


export interface FacilityEnergyUseGroupSummary {
    groupName: string,
    groupId: string,
    groupColor: string,
    annualEnergyUse: Array<{
        totalEnergyUse: number,
        percentOfFacilityUse: number,
        year: number,
        isPropegated: boolean
    }>
}
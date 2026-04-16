import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import * as _ from 'lodash';
import { ConvertValue } from "../conversions/convertValue";
import { getEnergyUseUnit } from "./energyFootprintCalculations";

export class EnergyUsesGroupSummary {
    groupName: string;
    groupId: string;
    groupEquipment: Array<IdbFacilityEnergyUseEquipment>;
    groupColor: string;
    equipmentAnnualEnergyUse: Array<{
        equipmentGuid: string,
        equipmentName: string,
        equipmentColor: string,
        annualEnergyUse: Array<{
            year: number,
            energyUse: number,
            percentOfTotal: number
        }>
    }> = [];
    totalAnnualEnergyUse: Array<{ year: number, energyUse: number }> = [];

    constructor(group: IdbFacilityEnergyUseGroup, equipment: Array<IdbFacilityEnergyUseEquipment>, facility: IdbFacility
    ) {
        this.groupName = group.name;
        this.groupId = group.guid;
        this.groupEquipment = equipment.filter(equip => equip.energyUseGroupId == group.guid);
        this.groupColor = group.color;
        let years: Array<number> = this.groupEquipment.flatMap(equip => equip.operatingConditionsData.map(data => data.year));
        years = _.uniq(years);
        this.setEquipmentAnnualEnergyUse(facility, years);
        this.setAnnualEnergyUse(years);
        this.setPercentOfTotalEnergyUse();
        this.orderResults();
    }

    setEquipmentAnnualEnergyUse(facility: IdbFacility, years: Array<number>) {
        let facilityUnits: string = facility.energyUnit;
        this.equipmentAnnualEnergyUse = new Array();
        this.groupEquipment.forEach(equip => {
            let equipmentEnergyUseData: Array<{ year: number, energyUse: number, percentOfTotal: number }> = new Array();
            equip.utilityData.forEach(ud => {
                let siteToSource: number = 1;
                let energyUseUnits: string = getEnergyUseUnit(ud.units);
                if (ud.energySource == 'Electricity' && facility.energyIsSource) {
                    siteToSource = 3;
                }
                ud.energyUse.forEach(eu => {
                    let convertedEnergyUse: number = new ConvertValue(eu.energyUse, energyUseUnits, facilityUnits).convertedValue;
                    equipmentEnergyUseData.push({
                        year: eu.year,
                        energyUse: convertedEnergyUse * siteToSource,
                        percentOfTotal: 0
                    })
                });

            });
            let annualEnergyUse: Array<{ year: number, energyUse: number, percentOfTotal: number }> = new Array();
            years.forEach(year => {
                //TODO: if no data for year, find nearest previous year
                //need to handle removing/shutting down equipment
                let energyUseDataForYear: Array<{ year: number, energyUse: number }> = equipmentEnergyUseData.filter(data => data.year == year);
                let totalEnergyUseForYear: number = 0;
                energyUseDataForYear.forEach(eu => {
                    totalEnergyUseForYear += eu.energyUse;
                });
                annualEnergyUse.push({ year: year, energyUse: totalEnergyUseForYear, percentOfTotal: 0 });
            });
            this.equipmentAnnualEnergyUse.push({ equipmentGuid: equip.guid, equipmentName: equip.name, annualEnergyUse: annualEnergyUse, equipmentColor: equip.color });
        });
    }

    setAnnualEnergyUse(years: Array<number>) {
        this.totalAnnualEnergyUse = new Array();
        let equipmentEnergyUse: Array<{
            year: number,
            energyUse: number,
            percentOfTotal: number
        }> = this.equipmentAnnualEnergyUse.flatMap(equipData => { return equipData.annualEnergyUse });
        years.forEach(year => {
            let equipmentEnergyUseForYear: number = _.sumBy(equipmentEnergyUse, (eqEnergyUse: { year: number, energyUse: number }) => {
                if (year == eqEnergyUse.year) {
                    return eqEnergyUse.energyUse;
                } else {
                    return 0;
                }
            });
            this.totalAnnualEnergyUse.push({ year: year, energyUse: equipmentEnergyUseForYear });
        })
    }

    setPercentOfTotalEnergyUse() {
        this.equipmentAnnualEnergyUse.forEach(equipData => {
            equipData.annualEnergyUse.forEach(yearData => {
                let totalYearData: { year: number, energyUse: number } = this.totalAnnualEnergyUse.find(tae => tae.year == yearData.year);
                if (totalYearData && totalYearData.energyUse != 0) {
                    yearData.percentOfTotal = (yearData.energyUse / totalYearData.energyUse) * 100;
                } else {
                    yearData.percentOfTotal = 0;
                }
            });
        });
    }

    orderResults() {
        this.totalAnnualEnergyUse = _.sortBy(this.totalAnnualEnergyUse, 'year', 'asc');
        this.equipmentAnnualEnergyUse.forEach(equipData => {
            equipData.annualEnergyUse = _.sortBy(equipData.annualEnergyUse, 'year', 'asc');
        });
    }

    getIncludedYears(): Array<number> {
        return this.totalAnnualEnergyUse.map(tau => tau.year);
    }

    filterHistory(): EnergyUsesGroupSummary {
        this.equipmentAnnualEnergyUse.forEach(equipAnnualEnergyUse => {
            //only include last year of data for each equipment
            equipAnnualEnergyUse.annualEnergyUse = _.orderBy(equipAnnualEnergyUse.annualEnergyUse, ['year'], ['desc']).slice(0, 1);
        });
        this.totalAnnualEnergyUse = _.orderBy(this.totalAnnualEnergyUse, ['year'], ['desc']).slice(0, 1);
        return this;
    }
}
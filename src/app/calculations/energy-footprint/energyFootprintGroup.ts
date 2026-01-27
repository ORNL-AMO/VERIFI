import { IdbFacility } from "src/app/models/idbModels/facility";
import { EquipmentUtilityDataEnergyUse, IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import * as _ from 'lodash';
import { getEnergyUseUnit } from "./energyFootprintCalculations";
import { ConvertValue } from "../conversions/convertValue";

export class EnergyFootprintGroup {

    groupName: string;
    groupId: string;
    groupEquipment: Array<IdbFacilityEnergyUseEquipment>;
    equipmentAnnualEnergyUse: Array<{ equipmentGuid: string, annualEnergyUse: Array<{ year: number, energyUse: number, percentOfTotal: number }> }> = [];
    totalAnnualEnergyUse: Array<{ year: number, energyUse: number }> = [];

    constructor(group: IdbFacilityEnergyUseGroup, equipment: Array<IdbFacilityEnergyUseEquipment>, facility: IdbFacility) {
        this.groupName = group.name;
        this.groupId = group.guid;
        this.groupEquipment = equipment.filter(equip => equip.energyUseGroupId == group.guid);
        this.setEquipmentAnnualEnergyUse(facility);
        this.setAnnualEnergyUse();
        this.setPercentOfTotalEnergyUse();
        this.orderResults();

    }

    setEquipmentAnnualEnergyUse(facility: IdbFacility) {
        let facilityUnits: string = facility.energyUnit;
        let years: Array<number> = this.groupEquipment.flatMap(equip => equip.operatingConditionsData.map(data => data.year));
        let uniqueYears: Array<number> = _.uniq(years);
        this.equipmentAnnualEnergyUse = new Array();
        this.groupEquipment.forEach(equip => {
            let equipmentEnergyUseData: Array<{ year: number, energyUse: number, percentOfTotal: number }> = new Array();
            equip.utilityData.forEach(ud => {
                let siteToSource: number = 1;
                let energyUseUnits: string = getEnergyUseUnit(ud.units);
                if(ud.energySource == 'Electricity' && energyUseUnits != 'MMBtu'){
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
            uniqueYears.forEach(year => {
                //TODO: if no data for year, find nearest previous year
                let energyUseDataForYear: Array<{ year: number, energyUse: number }> = equipmentEnergyUseData.filter(data => data.year == year);
                let totalEnergyUseForYear: number = 0;
                energyUseDataForYear.forEach(eu => {
                    totalEnergyUseForYear += eu.energyUse;
                });
                annualEnergyUse.push({ year: year, energyUse: totalEnergyUseForYear, percentOfTotal: 0 });
            });
            this.equipmentAnnualEnergyUse.push({ equipmentGuid: equip.guid, annualEnergyUse: annualEnergyUse });
        });
    }

    setAnnualEnergyUse() {
        this.totalAnnualEnergyUse = new Array();
        this.equipmentAnnualEnergyUse.forEach(equipData => {
            equipData.annualEnergyUse.forEach(yearData => {
                let yearIndex: number = this.totalAnnualEnergyUse.findIndex(tae => tae.year == yearData.year);
                if (yearIndex == -1) {
                    this.totalAnnualEnergyUse.push({ year: yearData.year, energyUse: yearData.energyUse });
                } else {
                    this.totalAnnualEnergyUse[yearIndex].energyUse += yearData.energyUse;
                }
            });
        });
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
        this.totalAnnualEnergyUse = _.sortBy(this.totalAnnualEnergyUse, 'year', 'desc');
        this.equipmentAnnualEnergyUse.forEach(equipData => {
            equipData.annualEnergyUse = _.sortBy(equipData.annualEnergyUse, 'year', 'desc');
        });
    }
}
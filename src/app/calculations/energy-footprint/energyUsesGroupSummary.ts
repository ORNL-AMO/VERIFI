import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import * as _ from 'lodash';
import { ConvertValue } from "../conversions/convertValue";
import { getEnergyUseSourceIcons, EnergyUseIcons } from "src/app/shared/sharedHelperFunctions";

export class EnergyUsesGroupSummary {
    groupName: string;
    groupId: string;
    groupEquipment: Array<IdbFacilityEnergyUseEquipment>;
    groupColor: string;
    groupIcons: Array<EnergyUseIcons>;
    equipmentAnnualEnergyUse: Array<EqupmentAnnualEnergyUse> = [];
    totalAnnualEnergyUse: Array<{ year: number, energyUse: number, isPropagated: boolean, percentOfFacilityUse: number, equipmentNotInUse?: boolean }> = [];

    constructor(group: IdbFacilityEnergyUseGroup, equipment: Array<IdbFacilityEnergyUseEquipment>, facility: IdbFacility,
        useLatestDataAvailable: boolean = true
    ) {
        this.groupName = group.name;
        this.groupId = group.guid;
        this.groupEquipment = equipment.filter(equip => equip.energyUseGroupId == group.guid);
        this.groupColor = group.color;
        let years: Array<number> = this.groupEquipment.flatMap(equip => equip.operatingConditionsData.map(data => data.year));
        years = _.uniq(years);
        this.setEquipmentAnnualEnergyUse(facility, years, useLatestDataAvailable);
        this.setAnnualEnergyUse(years);
        this.setPercentOfTotalEnergyUse();
        this.orderResults();
        this.setGroupIcons();
    }

    setEquipmentAnnualEnergyUse(facility: IdbFacility, years: Array<number>, useLatestDataAvailable: boolean = true) {
        let facilityUnits: string = facility.energyUnit;
        this.equipmentAnnualEnergyUse = new Array();
        this.groupEquipment.forEach(equip => {
            let icons: Array<EnergyUseIcons> = getEnergyUseSourceIcons(equip);
            let equipmentEnergyUseData: Array<AnnualEnergyUse> = new Array();
            equip.utilityData.forEach(ud => {
                ud.energyUse.forEach(eu => {
                    let convertedEnergyUse: number = new ConvertValue(eu.energyUse, eu.energyUseUnit, facilityUnits).convertedValue;
                    equipmentEnergyUseData.push({
                        year: eu.year,
                        energyUse: convertedEnergyUse,
                        percentOfEquipmentGroupTotal: 0,
                        isPropagated: false
                    })
                });
                if (useLatestDataAvailable) {
                    //if using latest data available, fill in missing years with closest previous year with data
                    let yearsWithData: Array<number> = ud.energyUse.map(eu => eu.year);
                    let missingYears: Array<number> = years.filter(year => yearsWithData.includes(year) == false);
                    missingYears.forEach(year => {
                        // let equipment: IdbFacilityEnergyUseEquipment = this.groupEquipment.find(equip => equip.guid == equipData.equipmentGuid);
                        if (equip.noLongerInUse?.isNoLongerInUse && equip.noLongerInUse?.year <= year) {
                            equipmentEnergyUseData.push({
                                year: year,
                                energyUse: 0,
                                percentOfEquipmentGroupTotal: 0,
                                isPropagated: true,
                                isNoLongerInUse: true
                            });
                        } else {
                            //find closest previous year with data
                            let closestYearData: { year: number, energyUse: number, energyUseUnit: string } = _.maxBy(ud.energyUse.filter(eu => eu.year < year), 'year');
                            if (closestYearData) {
                                let needsConversion: boolean = closestYearData.energyUseUnit != facilityUnits;
                                let energyUse: number = closestYearData.energyUse;
                                if (needsConversion) {
                                    energyUse = new ConvertValue(energyUse, closestYearData.energyUseUnit, facilityUnits).convertedValue;
                                }
                                equipmentEnergyUseData.push({
                                    year: year,
                                    energyUse: energyUse,
                                    percentOfEquipmentGroupTotal: 0,
                                    isPropagated: true
                                });
                            }
                        }
                    });
                }

            });
            let annualEnergyUse: Array<AnnualEnergyUse> = new Array();
            years.forEach(year => {
                //TODO: if no data for year, find nearest previous year
                //need to handle removing/shutting down equipment
                let energyUseDataForYear: Array<AnnualEnergyUse> = equipmentEnergyUseData.filter(data => data.year == year);
                let totalEnergyUseForYear: number = 0;
                energyUseDataForYear.forEach(eu => {
                    totalEnergyUseForYear += eu.energyUse;
                });
                let isPropagated: boolean = energyUseDataForYear.some(eu => eu.isPropagated == true);
                let isNoLongerInUse: boolean = energyUseDataForYear.some(eu => eu.isNoLongerInUse == true);
                annualEnergyUse.push({ year: year, energyUse: totalEnergyUseForYear, percentOfEquipmentGroupTotal: 0, isPropagated: isPropagated, isNoLongerInUse: isNoLongerInUse });
            });
            this.equipmentAnnualEnergyUse.push({ equipmentGuid: equip.guid, equipmentName: equip.name, annualEnergyUse: annualEnergyUse, equipmentColor: equip.color, icons: icons });
        });
    }

    setAnnualEnergyUse(years: Array<number>) {
        this.totalAnnualEnergyUse = new Array();
        let equipmentEnergyUse: Array<AnnualEnergyUse> = this.equipmentAnnualEnergyUse.flatMap(equipData => { return equipData.annualEnergyUse });
        years.forEach(year => {
            let equipmentEnergyUseForYear: number = _.sumBy(equipmentEnergyUse, (eqEnergyUse: { year: number, energyUse: number }) => {
                if (year == eqEnergyUse.year) {
                    return eqEnergyUse.energyUse;
                } else {
                    return 0;
                }
            });
            let isPropagated: boolean = equipmentEnergyUse.some(eu => eu.year == year && eu.isPropagated == true);
            this.totalAnnualEnergyUse.push({ year: year, energyUse: equipmentEnergyUseForYear, isPropagated: isPropagated, percentOfFacilityUse: 0 });
        })
    }

    setPercentOfTotalEnergyUse() {
        this.equipmentAnnualEnergyUse.forEach(equipData => {
            equipData.annualEnergyUse.forEach(yearData => {
                let totalYearData: { year: number, energyUse: number } = this.totalAnnualEnergyUse.find(tae => tae.year == yearData.year);
                if (totalYearData && totalYearData.energyUse != 0) {
                    yearData.percentOfEquipmentGroupTotal = (yearData.energyUse / totalYearData.energyUse) * 100;
                } else {
                    yearData.percentOfEquipmentGroupTotal = 0;
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

    checkIfYearIncluded(year: number) {
        //check if year is included
        //if not included, find closest previous year with data and use that year's data instead
        let includedYears: Array<number> = this.getIncludedYears();
        if (includedYears.includes(year) == false) {
            //TODO: need to handle equipment that is no longer in use and should not have propagated energy use in future years
            let closestYearData: { year: number, energyUse: number, isPropagated: boolean } = _.maxBy(this.totalAnnualEnergyUse.filter(tau => tau.year < year), 'year');
            if (closestYearData) {
                this.equipmentAnnualEnergyUse.forEach(equipData => {
                    let equipClosestYearData: AnnualEnergyUse = _.maxBy(equipData.annualEnergyUse.filter(eau => eau.year < year), 'year');
                    let equipEnergyUseForMostRecentYear: number = equipClosestYearData ? equipClosestYearData.energyUse : 0;
                    equipData.annualEnergyUse.push({
                        year: year,
                        energyUse: equipEnergyUseForMostRecentYear,
                        percentOfEquipmentGroupTotal: 0,
                        isPropagated: true,
                        isNoLongerInUse: equipClosestYearData.isNoLongerInUse
                    });
                });
                //calculate totals and add to totalAnnualEnergyUse from added equipment energy use
                let totalEnergyUseForYear: number = 0;
                this.equipmentAnnualEnergyUse.forEach(equipData => {
                    let equipYearData = equipData.annualEnergyUse.find(eau => eau.year == year);
                    if (equipYearData) {
                        totalEnergyUseForYear += equipYearData.energyUse;
                    }
                });
                this.totalAnnualEnergyUse.push({
                    year: year,
                    energyUse: totalEnergyUseForYear,
                    isPropagated: true,
                    percentOfFacilityUse: 0
                });

                this.setPercentOfTotalEnergyUse();
            } else {
                //if no previous year data, add 0 value for year
                this.equipmentAnnualEnergyUse.forEach(equipData => {
                    equipData.annualEnergyUse.push({
                        year: year,
                        energyUse: 0,
                        percentOfEquipmentGroupTotal: 0,
                        isPropagated: true,
                    });
                });
                this.totalAnnualEnergyUse.push({
                    year: year,
                    energyUse: 0,
                    isPropagated: true,
                    percentOfFacilityUse: 0,
                    equipmentNotInUse: true
                });
            }
        }
    }


    filterHistory(): EnergyUsesGroupSummary {
        this.equipmentAnnualEnergyUse.forEach(equipAnnualEnergyUse => {
            //only include last year of data for each equipment
            equipAnnualEnergyUse.annualEnergyUse = _.orderBy(equipAnnualEnergyUse.annualEnergyUse, ['year'], ['desc']).slice(0, 1);
        });
        this.totalAnnualEnergyUse = _.orderBy(this.totalAnnualEnergyUse, ['year'], ['desc']).slice(0, 1);
        return this;
    }

    setPercentOfFacilityUse(facilityTotals: Array<{ year: number, totalEnergyUse: number }>) {
        this.totalAnnualEnergyUse.forEach(yearData => {
            let facilityTotalForYear = facilityTotals.find(ft => ft.year == yearData.year);
            if (facilityTotalForYear && facilityTotalForYear.totalEnergyUse != 0) {
                yearData.percentOfFacilityUse = (yearData.energyUse / facilityTotalForYear.totalEnergyUse) * 100;
            } else {
                yearData.percentOfFacilityUse = 0;
            }
        });

        this.equipmentAnnualEnergyUse.forEach(equipData => {
            equipData.annualEnergyUse.forEach(yearData => {
                let facilityTotalForYear = facilityTotals.find(ft => ft.year == yearData.year);
                if (facilityTotalForYear && facilityTotalForYear.totalEnergyUse != 0) {
                    yearData.percentOfFacilityUse = (yearData.energyUse / facilityTotalForYear.totalEnergyUse) * 100;
                } else {
                    yearData.percentOfFacilityUse = 0;
                }
            });
        });
    }

    setGroupIcons() {
        let icons: Array<EnergyUseIcons> = new Array();
        this.equipmentAnnualEnergyUse.forEach(equipData => {
            equipData.icons.forEach(icon => {
                if (!icons.includes(icon)) {
                    icons.push(icon);
                }
            });
        });
        //alpha order
        this.groupIcons = _.sortBy(icons);
    }
}

export interface EqupmentAnnualEnergyUse {
    equipmentGuid: string,
    equipmentName: string,
    equipmentColor: string,
    icons: Array<EnergyUseIcons>,
    annualEnergyUse: Array<AnnualEnergyUse>
}

export interface AnnualEnergyUse {
    year: number,
    energyUse: number,
    percentOfEquipmentGroupTotal: number,
    percentOfFacilityUse?: number,
    isPropagated: boolean,
    isNoLongerInUse?: boolean
}
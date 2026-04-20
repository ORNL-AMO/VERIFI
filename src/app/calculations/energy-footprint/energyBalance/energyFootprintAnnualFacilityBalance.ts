import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { MeterSource } from "src/app/models/constantsAndTypes";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { EquipmentUtilityDataEnergyUse, IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import { IdbUtilityMeterGroup } from "src/app/models/idbModels/utilityMeterGroup";
import * as _ from 'lodash';
import { EnergyFootprintAnnualBalanceMeterGroup } from "./energyFootprintAnnualBalanceMeterGroup";
import { ConvertValue } from "../../conversions/convertValue";
import { convertMeterDataToSite } from "../../calanderization/calanderizationHelpers";


export class EnergyFootprintAnnualFacilityBalance {

    facility: IdbFacility;
    year: number;
    sourcesConsumption: Array<{
        source: MeterSource,
        actualEnergyUse: number,
        totalEquipmentEnergyUse: number,
        unaccountedEnergyUse: number,
        equipmentGroupEnergyUses: Array<{
            energyUseGroup: IdbFacilityEnergyUseGroup,
            energyUse: number,
            percentageOfTotalEnergyUse: number
        }>
    }>;

    meterGroupsAnnualBalances: Array<EnergyFootprintAnnualBalanceMeterGroup>;

    constructor(facility: IdbFacility, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>,
        calanderizedMeters: Array<CalanderizedMeter>, meterGroups: Array<IdbUtilityMeterGroup>, year: number, resultsBy: "facility" | "meterGroup" | "both",
        useLatestDataAvailable: boolean = true) {
        let facilityCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => cm.meter.facilityId == facility.guid);
        let siteCalanderizedMeters: Array<CalanderizedMeter> = convertMeterDataToSite(facilityCalanderizedMeters, facility.energyUnit);
        this.facility = facility;
        this.year = year;
        if (resultsBy == "facility" || resultsBy == "both") {
            this.setFacilitySourcesConsumption(siteCalanderizedMeters, energyUseGroups, equipment, facility, useLatestDataAvailable);
        }
        if (resultsBy == "meterGroup" || resultsBy == "both") {
            this.setMeterGroupAnnualBalances(siteCalanderizedMeters, energyUseGroups, equipment, meterGroups, facility, useLatestDataAvailable);
        }

    }

    setFacilitySourcesConsumption(calanderizedMeters: Array<CalanderizedMeter>, energyUseGroups: Array<IdbFacilityEnergyUseGroup>,
        equipment: Array<IdbFacilityEnergyUseEquipment>, facility: IdbFacility, useLatestDataAvailable: boolean) {
        this.sourcesConsumption = new Array();
        let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => cm.meter.facilityId == facility.guid);
        let facilityEquipment: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.facilityId == facility.guid);
        let sources: Array<MeterSource> = facilityMeters.map(cm => cm.meter.source);
        sources = _.uniq(sources);
        sources.forEach(source => {
            let sourceMeters: Array<CalanderizedMeter> = facilityMeters.filter(meter => meter.meter.source == source);
            let monthlyData: Array<MonthlyData> = sourceMeters.flatMap(meter => meter.monthlyData);
            let annualData: Array<MonthlyData> = monthlyData.filter(md => md.year == this.year);
            let actualEnergyUse: number = _.sumBy(annualData, (md: MonthlyData) => md.energyUse);
            let equipmentEnergyUse: number = 0;
            let equipmentGroupEnergyUses: Array<{
                energyUseGroup: IdbFacilityEnergyUseGroup,
                energyUse: number,
                percentageOfTotalEnergyUse: number
            }> = new Array();
            facilityEquipment.forEach(equip => {
                if (equip.noLongerInUse?.isNoLongerInUse && equip.noLongerInUse.year <= this.year) {
                    //if equipment is no longer in use and the year it was marked as no longer in use is less than or 
                    // equal to the selected year, do not include in calculations
                    return;
                }
                let equipmentGroup: IdbFacilityEnergyUseGroup = energyUseGroups.find(group => group.guid == equip.energyUseGroupId);
                if (equipmentGroup) {
                    equip.utilityData.forEach(ud => {
                        if (ud.energySource == source) {
                            let annualEnergyUseData: EquipmentUtilityDataEnergyUse = ud.energyUse.find(eu => eu.year == this.year);
                            if (!annualEnergyUseData && useLatestDataAvailable) {
                                //get closest year that is less than selected year
                                let closestYearData: EquipmentUtilityDataEnergyUse = ud.energyUse.reduce((closest, current) => {
                                    if (current.year < this.year && (!closest || current.year > closest.year)) {
                                        return current;
                                    }
                                    return closest;
                                }, null);
                                annualEnergyUseData = closestYearData;
                            }

                            if (annualEnergyUseData) {
                                let needsConversion: boolean = annualEnergyUseData.energyUseUnit != facility.energyUnit;
                                let energyUse: number = annualEnergyUseData.energyUse;
                                if (needsConversion) {
                                    energyUse = new ConvertValue(energyUse, annualEnergyUseData.energyUseUnit, facility.energyUnit).convertedValue;
                                }
                                equipmentEnergyUse += energyUse;
                                let groupIndex: number = equipmentGroupEnergyUses.findIndex(egu => egu.energyUseGroup.guid == equipmentGroup.guid);
                                if (groupIndex != -1) {
                                    equipmentGroupEnergyUses[groupIndex].energyUse += energyUse;
                                    equipmentGroupEnergyUses[groupIndex].percentageOfTotalEnergyUse = (equipmentGroupEnergyUses[groupIndex].energyUse / actualEnergyUse) * 100;
                                } else {
                                    equipmentGroupEnergyUses.push({
                                        energyUseGroup: equipmentGroup,
                                        energyUse: energyUse,
                                        percentageOfTotalEnergyUse: (energyUse / actualEnergyUse) * 100
                                    });
                                }
                            }
                        }
                    });
                }
            });
            //order equipment group energy uses by energy use amount
            equipmentGroupEnergyUses = _.orderBy(equipmentGroupEnergyUses, ['energyUse'], ['desc']);
            this.sourcesConsumption.push({
                source: source,
                actualEnergyUse: actualEnergyUse,
                totalEquipmentEnergyUse: equipmentEnergyUse,
                unaccountedEnergyUse: actualEnergyUse - equipmentEnergyUse,
                equipmentGroupEnergyUses: equipmentGroupEnergyUses
            });
        });
    }

    setMeterGroupAnnualBalances(calanderizedMeters: Array<CalanderizedMeter>, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>,
        meterGroups: Array<IdbUtilityMeterGroup>, facility: IdbFacility, useLatestDataAvailable: boolean) {
        let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => cm.meter.facilityId == facility.guid);
        let facilityEquipment: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.facilityId == facility.guid);
        let facilityMeterGroups: Array<IdbUtilityMeterGroup> = meterGroups.filter(mg => mg.facilityId == facility.guid);
        let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = energyUseGroups.filter(eug => eug.facilityId == facility.guid);
        this.meterGroupsAnnualBalances = new Array();
        facilityMeterGroups.forEach(meterGroup => {
            let meterGroupBalance: EnergyFootprintAnnualBalanceMeterGroup = new EnergyFootprintAnnualBalanceMeterGroup(facilityEnergyUseGroups, facilityEquipment, facilityMeters, meterGroup, this.year, facility, useLatestDataAvailable);
            this.meterGroupsAnnualBalances.push(meterGroupBalance);
        });
        //TODO: add meters without meter group
        let metersWithoutGroup: Array<CalanderizedMeter> = facilityMeters.filter(cMeter => !cMeter.meter.groupId);
        if (metersWithoutGroup.length > 0) {
            let ungroupedMeterGroup: IdbUtilityMeterGroup = {
                facilityId: facility.guid,
                accountId: facility.accountId,
                groupType: 'Energy',
                name: 'Ungrouped Meters',
                guid: 'ungrouped-meters',
                createdDate: new Date(),
                modifiedDate: new Date()
            }
            let ungroupedMeterGroupBalance: EnergyFootprintAnnualBalanceMeterGroup = new EnergyFootprintAnnualBalanceMeterGroup(facilityEnergyUseGroups, facilityEquipment, metersWithoutGroup, ungroupedMeterGroup, this.year, facility, useLatestDataAvailable);
            this.meterGroupsAnnualBalances.push(ungroupedMeterGroupBalance);
        }

        //TODO: add equipment that isn't linked to a meter group as its own "meter group" with source = "unlinked" or something similar
    }

    /**
     * Gets the total energy consumption for this facility across all sources
     */
    getTotalFacilityEnergyUse(): number {
        return _.sumBy(this.sourcesConsumption, source => source.actualEnergyUse);
    }

    /**
     * Gets the total equipment energy use for this facility across all sources
     */
    getTotalEquipmentEnergyUse(): number {
        return _.sumBy(this.sourcesConsumption, source => source.totalEquipmentEnergyUse);
    }

    /**
     * Gets the total unaccounted energy use for this facility across all sources
     */
    getTotalUnaccountedEnergyUse(): number {
        return _.sumBy(this.sourcesConsumption, source => source.unaccountedEnergyUse);
    }

    /**
     * Gets all unique equipment groups across facility or meter groups
     * @param fromMeterGroups - If true, gets groups from meter groups; if false, from facility sources
     */
    getUniqueEquipmentGroups(fromMeterGroups: boolean = false): Array<{ guid: string, name: string, totalEnergyUse: number }> {
        const equipmentGroupMap = new Map<string, { name: string, totalEnergyUse: number }>();

        if (fromMeterGroups && this.meterGroupsAnnualBalances) {
            this.meterGroupsAnnualBalances.forEach(meterGroup => {
                meterGroup.sourcesConsumption.forEach(source => {
                    source.equipmentGroupEnergyUses.forEach(groupUse => {
                        const groupId = groupUse.energyUseGroup.guid;
                        const existing = equipmentGroupMap.get(groupId);
                        if (existing) {
                            existing.totalEnergyUse += groupUse.energyUse;
                        } else {
                            equipmentGroupMap.set(groupId, {
                                name: groupUse.energyUseGroup.name,
                                totalEnergyUse: groupUse.energyUse
                            });
                        }
                    });
                });
            });
        } else {
            this.sourcesConsumption.forEach(source => {
                source.equipmentGroupEnergyUses.forEach(groupUse => {
                    const groupId = groupUse.energyUseGroup.guid;
                    const existing = equipmentGroupMap.get(groupId);
                    if (existing) {
                        existing.totalEnergyUse += groupUse.energyUse;
                    } else {
                        equipmentGroupMap.set(groupId, {
                            name: groupUse.energyUseGroup.name,
                            totalEnergyUse: groupUse.energyUse
                        });
                    }
                });
            });
        }

        return Array.from(equipmentGroupMap.entries()).map(([guid, data]) => ({
            guid,
            name: data.name,
            totalEnergyUse: data.totalEnergyUse
        }));
    }

    /**
     * Gets all unique sources across facility or meter groups with their total consumption
     * @param fromMeterGroups - If true, gets sources from meter groups; if false, from facility sources
     */
    getUniqueSources(fromMeterGroups: boolean = false): Array<{ source: string, totalEnergyUse: number }> {
        const sourceMap = new Map<string, number>();

        if (fromMeterGroups && this.meterGroupsAnnualBalances) {
            this.meterGroupsAnnualBalances.forEach(meterGroup => {
                meterGroup.sourcesConsumption.forEach(source => {
                    const existing = sourceMap.get(source.source) || 0;
                    sourceMap.set(source.source, existing + source.actualEnergyUse);
                });
            });
        } else {
            this.sourcesConsumption.forEach(source => {
                const existing = sourceMap.get(source.source) || 0;
                sourceMap.set(source.source, existing + source.actualEnergyUse);
            });
        }

        return Array.from(sourceMap.entries()).map(([source, totalEnergyUse]) => ({
            source,
            totalEnergyUse
        }));
    }

    /**
     * Gets energy flow data for visualization - maps sources to equipment groups with energy amounts
     * @param fromMeterGroups - If true, aggregates from meter groups; if false, uses facility data
     */
    getEnergyFlowData(fromMeterGroups: boolean = false): Map<string, Map<string, number>> {
        const flowMap = new Map<string, Map<string, number>>();

        if (fromMeterGroups && this.meterGroupsAnnualBalances) {
            this.meterGroupsAnnualBalances.forEach(meterGroup => {
                meterGroup.sourcesConsumption.forEach(source => {
                    const sourceKey = source.source;
                    if (!flowMap.has(sourceKey)) {
                        flowMap.set(sourceKey, new Map());
                    }
                    const equipmentMap = flowMap.get(sourceKey)!;

                    source.equipmentGroupEnergyUses.forEach(groupUse => {
                        const groupKey = groupUse.energyUseGroup.guid;
                        const existing = equipmentMap.get(groupKey) || 0;
                        equipmentMap.set(groupKey, existing + groupUse.energyUse);
                    });

                    // Handle unaccounted energy
                    if (source.unaccountedEnergyUse > 0) {
                        const unaccountedKey = `unaccounted-${source.source}`;
                        const existing = equipmentMap.get(unaccountedKey) || 0;
                        equipmentMap.set(unaccountedKey, existing + source.unaccountedEnergyUse);
                    }
                });
            });
        } else {
            this.sourcesConsumption.forEach(source => {
                const sourceKey = source.source;
                if (!flowMap.has(sourceKey)) {
                    flowMap.set(sourceKey, new Map());
                }
                const equipmentMap = flowMap.get(sourceKey)!;

                source.equipmentGroupEnergyUses.forEach(groupUse => {
                    const groupKey = groupUse.energyUseGroup.guid;
                    const existing = equipmentMap.get(groupKey) || 0;
                    equipmentMap.set(groupKey, existing + groupUse.energyUse);
                });

                // Handle unaccounted energy
                if (source.unaccountedEnergyUse > 0) {
                    const unaccountedKey = `unaccounted-${source.source}`;
                    const existing = equipmentMap.get(unaccountedKey) || 0;
                    equipmentMap.set(unaccountedKey, existing + source.unaccountedEnergyUse);
                }
            });
        }

        return flowMap;
    }

}
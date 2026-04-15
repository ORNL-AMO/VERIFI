import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { MeterSource } from "src/app/models/constantsAndTypes";
import { EquipmentUtilityDataEnergyUse, IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import { IdbUtilityMeterGroup } from "src/app/models/idbModels/utilityMeterGroup";
import * as _ from 'lodash';
import { getEnergyUseUnit } from "../energyFootprintCalculations";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { ConvertValue } from "../../conversions/convertValue";
import { convertMeterDataToSite } from "../../calanderization/calanderizeMeters";

export class EnergyFootprintAnnualBalanceMeterGroup {

    meterGroup: IdbUtilityMeterGroup;
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
    constructor(energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>,
        calanderizedMeters: Array<CalanderizedMeter>, utilityMeterGroup: IdbUtilityMeterGroup, year: number, facility: IdbFacility,
        useLatestDataAvailable: boolean) {
        let facilityCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => cm.meter.facilityId == facility.guid);
        let siteCalanderizedMeters: Array<CalanderizedMeter> = convertMeterDataToSite(facilityCalanderizedMeters);
        this.meterGroup = utilityMeterGroup;
        this.year = year;
        this.setSourcesConsumption(siteCalanderizedMeters, energyUseGroups, equipment, facility, useLatestDataAvailable);
    }

    setSourcesConsumption(calanderizedMeters: Array<CalanderizedMeter>, energyUseGroups: Array<IdbFacilityEnergyUseGroup>,
        equipment: Array<IdbFacilityEnergyUseEquipment>, facility: IdbFacility, useLatestDataAvailable: boolean) {
        this.sourcesConsumption = new Array();
        let metersInGroup: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => cm.meter.groupId == this.meterGroup.guid);
        let sources: Array<MeterSource> = metersInGroup.map(meter => meter.meter.source);
        let equipmentLinkedToMeterGroup: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.utilityMeterGroupIds.includes(this.meterGroup.guid));
        sources = _.uniq(sources);
        sources.forEach(source => {
            let sourceMeters: Array<CalanderizedMeter> = metersInGroup.filter(meter => meter.meter.source == source);
            let monthlyData: Array<MonthlyData> = sourceMeters.flatMap(meter => meter.monthlyData);
            let annualData: Array<MonthlyData> = monthlyData.filter(md => md.year == this.year);
            let actualEnergyUse: number = _.sumBy(annualData, (md: MonthlyData) => md.energyUse);
            let equipmentEnergyUse: number = 0;
            let equipmentGroupEnergyUses: Array<{
                energyUseGroup: IdbFacilityEnergyUseGroup,
                energyUse: number,
                percentageOfTotalEnergyUse: number
            }> = new Array();
            equipmentLinkedToMeterGroup.forEach(equip => {
                let equipmentGroup: IdbFacilityEnergyUseGroup = energyUseGroups.find(group => group.guid == equip.energyUseGroupId);
                if (equipmentGroup) {
                    equip.utilityData.forEach(ud => {
                        if (ud.energySource == source) {
                            let annualEnergyUse: EquipmentUtilityDataEnergyUse = ud.energyUse.find(eu => eu.year == this.year);
                            if (!annualEnergyUse && useLatestDataAvailable) {
                                //get closest year that is less than selected year
                                let closestYearData: EquipmentUtilityDataEnergyUse = ud.energyUse.reduce((closest, current) => {
                                    if (current.year < this.year && (!closest || current.year > closest.year)) {
                                        return current;
                                    }
                                    return closest;
                                }, null);
                                annualEnergyUse = closestYearData;
                            }
                            if (annualEnergyUse) {
                                let calculatedUnit: string = getEnergyUseUnit(ud.units)
                                let needsConversion: boolean = calculatedUnit != facility.energyUnit;
                                let energyUse: number = annualEnergyUse.energyUse;
                                if (needsConversion) {
                                    energyUse = new ConvertValue(energyUse, calculatedUnit, facility.energyUnit).convertedValue;
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

    getTotalEnergyUse(): number {
        return _.sumBy(this.sourcesConsumption, source => source.actualEnergyUse);
    }

    /**
     * Gets the total equipment energy use for this meter group across all sources
     */
    getTotalEquipmentEnergyUse(): number {
        return _.sumBy(this.sourcesConsumption, source => source.totalEquipmentEnergyUse);
    }

    /**
     * Gets the total unaccounted energy use for this meter group across all sources
     */
    getTotalUnaccountedEnergyUse(): number {
        return _.sumBy(this.sourcesConsumption, source => source.unaccountedEnergyUse);
    }

    /**
     * Gets all unique equipment groups in this meter group with their total energy use
     */
    getEquipmentGroups(): Array<{ guid: string, name: string, totalEnergyUse: number }> {
        const equipmentGroupMap = new Map<string, { name: string, totalEnergyUse: number }>();

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

        return Array.from(equipmentGroupMap.entries()).map(([guid, data]) => ({
            guid,
            name: data.name,
            totalEnergyUse: data.totalEnergyUse
        }));
    }

    /**
     * Gets the energy use breakdown by source for this meter group
     */
    getSourceBreakdown(): Array<{ source: string, actualEnergyUse: number, equipmentEnergyUse: number, unaccountedEnergyUse: number }> {
        return this.sourcesConsumption.map(source => ({
            source: source.source,
            actualEnergyUse: source.actualEnergyUse,
            equipmentEnergyUse: source.totalEquipmentEnergyUse,
            unaccountedEnergyUse: source.unaccountedEnergyUse
        }));
    }

    /**
     * Gets energy efficiency percentage for this meter group (equipment use / total use)
     */
    getEnergyEfficiencyPercentage(): number {
        const totalEnergyUse = this.getTotalEnergyUse();
        const totalEquipmentUse = this.getTotalEquipmentEnergyUse();
        return totalEnergyUse > 0 ? (totalEquipmentUse / totalEnergyUse) * 100 : 0;
    }

    getSource(): MeterSource | 'Mixed' {
        const uniqueSources = _.uniq(this.sourcesConsumption.map(s => s.source));
        if (uniqueSources.length === 1) {
            return uniqueSources[0];
        } else {
            return 'Mixed';
        }
    }
}
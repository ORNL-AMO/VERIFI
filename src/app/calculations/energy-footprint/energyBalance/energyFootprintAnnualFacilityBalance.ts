import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { MeterSource } from "src/app/models/constantsAndTypes";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { EquipmentUtilityDataEnergyUse, IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import { IdbUtilityMeterGroup } from "src/app/models/idbModels/utilityMeterGroup";
import * as _ from 'lodash';
import { EnergyFootprintAnnualBalanceMeterGroup } from "./energyFootprintAnnualBalanceMeterGroup";
import { ConvertValue } from "../../conversions/convertValue";
import { getEnergyUseUnit } from "../energyFootprintCalculations";


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
        calanderizedMeters: Array<CalanderizedMeter>, meterGroups: Array<IdbUtilityMeterGroup>, year: number, resultsBy: "facility" | "meterGroup" | "both") {
        this.facility = facility;
        this.year = year;
        if (resultsBy == "facility" || resultsBy == "both") {
            this.setFacilitySourcesConsumption(calanderizedMeters, energyUseGroups, equipment, facility);
        }
        if (resultsBy == "meterGroup" || resultsBy == "both") {
            this.setMeterGroupAnnualBalances(calanderizedMeters, energyUseGroups, equipment, meterGroups, facility);
        }

    }

    setFacilitySourcesConsumption(calanderizedMeters: Array<CalanderizedMeter>, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>, facility: IdbFacility) {
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
                let equipmentGroup: IdbFacilityEnergyUseGroup = energyUseGroups.find(group => group.guid == equip.energyUseGroupId);
                if (equipmentGroup) {
                    equip.utilityData.forEach(ud => {
                        if (ud.energySource == source) {
                            let annualEnergyUseData: EquipmentUtilityDataEnergyUse = ud.energyUse.find(eu => eu.year == this.year);
                            if (annualEnergyUseData) {
                                // new ConvertValue(energyUse, calculatedUnit, resultsUnit)
                                let calculatedUnit: string = getEnergyUseUnit(ud.units)
                                let needsConversion: boolean = calculatedUnit != facility.energyUnit;
                                let energyUse: number = annualEnergyUseData.energyUse;
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
            this.sourcesConsumption.push({
                source: source,
                actualEnergyUse: actualEnergyUse,
                totalEquipmentEnergyUse: equipmentEnergyUse,
                unaccountedEnergyUse: actualEnergyUse - equipmentEnergyUse,
                equipmentGroupEnergyUses: equipmentGroupEnergyUses
            });
        });
    }

    setMeterGroupAnnualBalances(calanderizedMeters: Array<CalanderizedMeter>, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>, meterGroups: Array<IdbUtilityMeterGroup>, facility: IdbFacility) {
        let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => cm.meter.facilityId == facility.guid);
        let facilityEquipment: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.facilityId == facility.guid);
        let facilityMeterGroups: Array<IdbUtilityMeterGroup> = meterGroups.filter(mg => mg.facilityId == facility.guid);
        let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = energyUseGroups.filter(eug => eug.facilityId == facility.guid);
        this.meterGroupsAnnualBalances = new Array();
        facilityMeterGroups.forEach(meterGroup => {
            let meterGroupBalance: EnergyFootprintAnnualBalanceMeterGroup = new EnergyFootprintAnnualBalanceMeterGroup(facilityEnergyUseGroups, facilityEquipment, facilityMeters, meterGroup, this.year, facility);
            this.meterGroupsAnnualBalances.push(meterGroupBalance);
        });
        //TODO: add equipment that isn't linked to a meter group as its own "meter group" with source = "unlinked" or something similar
    }

}
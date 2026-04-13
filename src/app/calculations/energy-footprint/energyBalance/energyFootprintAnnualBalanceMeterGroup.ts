import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { MeterSource } from "src/app/models/constantsAndTypes";
import { IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import { IdbUtilityMeterGroup } from "src/app/models/idbModels/utilityMeterGroup";
import * as _ from 'lodash';
import { getEnergyUseUnit } from "../energyFootprintCalculations";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { ConvertValue } from "../../conversions/convertValue";

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
        calanderizedMeters: Array<CalanderizedMeter>, utilityMeterGroup: IdbUtilityMeterGroup, year: number, facility: IdbFacility) {
        this.meterGroup = utilityMeterGroup;
        this.year = year;
        this.setSourcesConsumption(calanderizedMeters, energyUseGroups, equipment, facility);
    }

    setSourcesConsumption(calanderizedMeters: Array<CalanderizedMeter>, energyUseGroups: Array<IdbFacilityEnergyUseGroup>,
        equipment: Array<IdbFacilityEnergyUseEquipment>, facility: IdbFacility) {
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
                            let annualEnergyUse = ud.energyUse.find(eu => eu.year == this.year);
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
            this.sourcesConsumption.push({
                source: source,
                actualEnergyUse: actualEnergyUse,
                totalEquipmentEnergyUse: equipmentEnergyUse,
                unaccountedEnergyUse: actualEnergyUse - equipmentEnergyUse,
                equipmentGroupEnergyUses: equipmentGroupEnergyUses
            });
        });

    }
}
import { MeterSource } from "src/app/models/constantsAndTypes";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { EquipmentUtilityDataEnergyUse, IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups"
import { getEnergyUseUnit } from "../energyFootprintCalculations";
import { ConvertValue } from "../../conversions/convertValue";

export class EnergyFootprintAnnualGroupBalance {

    year: number;
    sourcesConsumption: Array<{
        source: MeterSource,
        totalEquipmentEnergyUse: number,
        equipmentEnergyUses: Array<{
            equipment: IdbFacilityEnergyUseEquipment,
            energyUse: number,
            percentageOfTotalEnergyUse: number
        }>
    }>;
    facility: IdbFacility;
    constructor(energyUseGroups: IdbFacilityEnergyUseGroup, equipment: Array<IdbFacilityEnergyUseEquipment>, year: number, facility: IdbFacility, useLatestDataAvailable: boolean = true) {
        this.year = year;
        this.facility = facility;
        this.setSourcesConsumption(energyUseGroups, equipment, useLatestDataAvailable);
    }

    setSourcesConsumption(energyUseGroups: IdbFacilityEnergyUseGroup, equipment: Array<IdbFacilityEnergyUseEquipment>, useLatestDataAvailable: boolean) {
        this.sourcesConsumption = new Array();
        let equipmentInGroup: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.energyUseGroupId == energyUseGroups.guid);
        let sources: Array<MeterSource> = equipmentInGroup.map(equip => equip.utilityData.map(ud => ud.energySource)).flat();
        sources = [...new Set(sources)];
        sources.forEach(source => {
            let equipmentWithSource: Array<IdbFacilityEnergyUseEquipment> = equipmentInGroup.filter(equip => equip.utilityData.some(ud => ud.energySource == source));
            let totalEquipmentEnergyUse: number = 0;
            let equipmentEnergyUses: Array<{
                equipment: IdbFacilityEnergyUseEquipment,
                energyUse: number,
                percentageOfTotalEnergyUse: number
            }> = new Array();
            equipmentWithSource.forEach(equip => {
                let utilityDataForSource = equip.utilityData.find(ud => ud.energySource == source);
                if (utilityDataForSource) {
                    let annualEnergyUseData: EquipmentUtilityDataEnergyUse = utilityDataForSource.energyUse.find(eu => eu.year == this.year);
                    if (!annualEnergyUseData && useLatestDataAvailable) {
                        //get closest year that is less than selected year
                        let closestYearData: EquipmentUtilityDataEnergyUse = utilityDataForSource.energyUse.reduce((closest, current) => {
                            if (current.year < this.year && (!closest || current.year > closest.year)) {
                                return current;
                            }
                            return closest;
                        }, null);
                        annualEnergyUseData = closestYearData;
                    }
                    if (annualEnergyUseData) {
                        let calculatedUnit: string = getEnergyUseUnit(utilityDataForSource.units)
                        let needsConversion: boolean = calculatedUnit != this.facility.energyUnit;
                        let energyUse: number = annualEnergyUseData.energyUse;
                        if (needsConversion) {
                            energyUse = new ConvertValue(energyUse, calculatedUnit, this.facility.energyUnit).convertedValue;
                        }
                        totalEquipmentEnergyUse += energyUse;
                        equipmentEnergyUses.push({
                            equipment: equip,
                            energyUse: energyUse,
                            percentageOfTotalEnergyUse: 0
                        });
                    }
                }
            });
            equipmentEnergyUses.forEach(eu => {
                eu.percentageOfTotalEnergyUse = totalEquipmentEnergyUse > 0 ? (eu.energyUse / totalEquipmentEnergyUse) * 100 : 0;
            });
            this.sourcesConsumption.push({
                source: source,
                totalEquipmentEnergyUse: totalEquipmentEnergyUse,
                equipmentEnergyUses: equipmentEnergyUses
            });
        });
    }

    /**
     * Returns the sum of energy use across all sources for this group.
     * Used for display totals in charts and labels.
     */
    getTotalEnergyUse(): number {
        return this.sourcesConsumption.reduce((total, sc) => total + sc.totalEquipmentEnergyUse, 0);
    }
}
import { MeterSource } from "src/app/models/constantsAndTypes"

export interface AnnualFootprintGroupSourceResult {
    year: number,
    energyUse: number,
    totalEnergyUse: number,
    percentOfTotal: number,
    equipmentEnergyUse: Array<{
        equipmentGuid: string,
        equipmentName: string,
        energyUse: number,
        percentOfTotal: number
    }>,
}

export interface FootprintEquipmentAnnualResult {
    equipmentGuid: string,
    equipmentName: string,
    color: string,
    annualResults: Array<FootprintAnnualResult>
}

export interface FootprintAnnualResult {
    year: number,
    energyUse: number,
    totalEnergyUse?: number,
    percentOfTotal: number
}

export interface IncludedSourcesAnnualResult {
    source: MeterSource,
    showGroupResults: boolean,
    groupResults: Array<{
        groupName: string,
        groupId: string,
        color: string,
        annualSourceResults: Array<AnnualFootprintGroupSourceResult>
    }>
    annualTotals: Array<FootprintAnnualResult>
}

export interface FootprintGroupIncludedSourcesAnnualResult {
    source: MeterSource,
    annualSourceResults: Array<AnnualFootprintGroupSourceResult>,
    showEquipmentResults: boolean,
    equipmentAnnualResults: Array<FootprintEquipmentAnnualResult>;

}

export interface MeterGroupAnnualResult {
    meterGroupId: string,
    meterGroupName: string,
    annualResults: Array<AnnualFootprintGroupSourceResult>,
    showGroupResults: boolean,
    energyUseGroupAnnualResults: Array<{
        groupGuid: string,
        groupName: string,
        color: string,
        annualResults: Array<FootprintAnnualResult>
    }>;
}

export interface FootprintGroupMeterGroupAnnualResult {
    meterGroupId: string,
    meterGroupName: string,
    annualResults: Array<AnnualFootprintGroupSourceResult>,
    showEquipmentResults: boolean,
    equipmentAnnualResults: Array<FootprintEquipmentAnnualResult>
}
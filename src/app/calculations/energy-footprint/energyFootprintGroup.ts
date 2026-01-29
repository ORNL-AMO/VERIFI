import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import * as _ from 'lodash';
import { getEnergyUseUnit } from "./energyFootprintCalculations";
import { ConvertValue } from "../conversions/convertValue";
import { MeterSource } from "src/app/models/constantsAndTypes";
import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbUtilityMeterGroup } from "src/app/models/idbModels/utilityMeterGroup";

export class EnergyFootprintGroup {

    groupName: string;
    groupId: string;
    groupEquipment: Array<IdbFacilityEnergyUseEquipment>;
    includedSources: Array<MeterSource>;

    meterGroups: Array<{ guid: string, name: string }>;
    includedSourcesAnnualResults: Array<{
        source: MeterSource,
        annualSourceResults: Array<AnnualFootprintGroupSourceResult>
    }> = [];

    meterGroupsAnnualResults: Array<{
        meterGroupId: string,
        meterGroupName: string,
        annualResults: Array<AnnualFootprintGroupSourceResult>
        // {
        //     year: number,
        //     totalEquipmentEnergyUse: number,
        //     equipmentEnergyUse: Array<{
        //         equipmentGuid: string,
        //         equipmentName: string,
        //         energyUse: number,
        //         percentOfTotal: number
        //     }>,
        //     percentOfTotalEnergyUse: number
        // }>
    }> = [];

    constructor(group: IdbFacilityEnergyUseGroup, equipment: Array<IdbFacilityEnergyUseEquipment>, facility: IdbFacility,
        calanderizedMeters: Array<CalanderizedMeter>, utilityMeterGroups: Array<IdbUtilityMeterGroup>
    ) {
        this.groupName = group.name;
        this.groupId = group.guid;
        this.groupEquipment = equipment.filter(equip => equip.energyUseGroupId == group.guid);
        let groupCalanderizedMeters: Array<CalanderizedMeter> = this.getGroupCalanderizedMeters(calanderizedMeters, utilityMeterGroups);
        let years: Array<number> = this.groupEquipment.flatMap(equip => equip.operatingConditionsData.map(data => data.year));
        years = _.uniq(years);

        this.setIncludedSources();
        this.setIncludedSourcesAnnualResults(groupCalanderizedMeters, years, facility, calanderizedMeters);
        this.setMeterGroupsAnnualResults(groupCalanderizedMeters, years, facility);
        this.orderResults();
    }

    setIncludedSources() {
        this.includedSources = this.groupEquipment.flatMap(equip => {
            return equip.utilityData.map(ud => ud.energySource);
        });
        this.includedSources = _.uniq(this.includedSources);
    }

    setIncludedSourcesAnnualResults(groupCalanderizedMeters: Array<CalanderizedMeter>, years: Array<number>, facility: IdbFacility, allCalanderizedMeters: Array<CalanderizedMeter>) {
        this.includedSourcesAnnualResults = new Array();
        this.includedSources.forEach(source => {
            let annualSourceResults: Array<AnnualFootprintGroupSourceResult> = new Array();
            years.forEach(year => {

                let sourceMeters: Array<CalanderizedMeter> = groupCalanderizedMeters.filter(cm => cm.meter.source == source);
                let monthlyDataForSourceAndYear: Array<MonthlyData> = sourceMeters.flatMap(cm => cm.monthlyData.filter(md => md.year == year));
                let includedMetersEnergyUse: number = _.sumBy(monthlyDataForSourceAndYear, (mData: MonthlyData) => { return mData.energyUse; });

                let totalSourceMeters: Array<CalanderizedMeter> = allCalanderizedMeters.filter(cm => cm.meter.source == source);
                let totalMonthlyDataForSourceAndYear: Array<MonthlyData> = totalSourceMeters.flatMap(cm => cm.monthlyData.filter(md => md.year == year));
                let totalSourceEnergyUse: number = _.sumBy(totalMonthlyDataForSourceAndYear, (mData: MonthlyData) => { return mData.energyUse; });


                let equipmentEnergyUse: Array<{
                    equipmentGuid: string,
                    equipmentName: string,
                    energyUse: number,
                    percentOfTotal: number
                }> = new Array();
                this.groupEquipment.forEach(equip => {
                    equip.utilityData.forEach(ud => {
                        if (ud.energySource == source) {
                            ud.energyUse.forEach(eu => {
                                if (eu.year == year) {
                                    let energyUseUnits: string = getEnergyUseUnit(ud.units);
                                    let siteToSource: number = 1;
                                    if (ud.energySource == 'Electricity' && energyUseUnits != 'MMBtu') {
                                        siteToSource = 3;
                                    }
                                    let convertedEnergyUse: number = new ConvertValue(eu.energyUse, energyUseUnits, facility.energyUnit).convertedValue;
                                    // equipmentEnergyUseForYear += (convertedEnergyUse * siteToSource);
                                    equipmentEnergyUse.push({
                                        equipmentGuid: equip.guid,
                                        equipmentName: equip.name,
                                        energyUse: convertedEnergyUse * siteToSource,
                                        percentOfTotal: 0
                                    });
                                }
                            });
                        }
                    });
                });

                let equipmentEnergyUseForYear: number = _.sumBy(equipmentEnergyUse, (ed: { energyUse: number }) => { return ed.energyUse; });
                equipmentEnergyUse.forEach(ed => {
                    let percentOfTotal: number = 0;
                    if (equipmentEnergyUseForYear != 0) {
                        percentOfTotal = (ed.energyUse / equipmentEnergyUseForYear) * 100;
                    }
                    ed.percentOfTotal = percentOfTotal;
                });
                let percentIncludedEnergyUse: number = 0;
                if (includedMetersEnergyUse != 0) {
                    percentIncludedEnergyUse = (equipmentEnergyUseForYear / includedMetersEnergyUse) * 100;
                }
                let percentTotalEnergyUse: number = 0;
                if (totalSourceEnergyUse != 0) {
                    percentTotalEnergyUse = (equipmentEnergyUseForYear / totalSourceEnergyUse) * 100;
                }
                annualSourceResults.push({
                    year: year,
                    includedMetersEnergyUse: includedMetersEnergyUse,
                    totalSourceEnergyUse: totalSourceEnergyUse,
                    totalEquipmentEnergyUse: equipmentEnergyUseForYear,
                    percentIncludedEnergyUse: percentIncludedEnergyUse,
                    percentTotalEnergyUse: percentTotalEnergyUse,
                    equipmentEnergyUse: equipmentEnergyUse
                });
            });
            this.includedSourcesAnnualResults.push({
                source: source,
                annualSourceResults: annualSourceResults
            });
        });
    }

    setMeterGroupsAnnualResults(groupCalanderizedMeters: Array<CalanderizedMeter>, years: Array<number>, facility: IdbFacility) {
        this.meterGroupsAnnualResults = new Array();
        this.meterGroups.forEach(meterGroup => {
            let annualResults: Array<AnnualFootprintGroupSourceResult> = new Array();
            // {
            //     year: number,
            //     totalEquipmentEnergyUse: number,
            //     equipmentEnergyUse: Array<{
            //         equipmentGuid: string,
            //         equipmentName: string,
            //         energyUse: number,
            //         percentOfTotal: number
            //     }>,
            //     percentOfTotalEnergyUse: number
            // }> = new Array();
            years.forEach(year => {
                let groupMeters: Array<CalanderizedMeter> = groupCalanderizedMeters.filter(cm => cm.meter.groupId == meterGroup.guid);
                let monthlyDataForGroupAndYear: Array<MonthlyData> = groupMeters.flatMap(cm => cm.monthlyData.filter(md => md.year == year));
                let includedMetersEnergyUse: number = _.sumBy(monthlyDataForGroupAndYear, (mData: MonthlyData) => { return mData.energyUse; });

                let equipmentEnergyUseData: Array<{ equipmentGuid: string, equipmentName: string, energyUse: number, percentOfTotal: number }> = new Array();
                this.groupEquipment.forEach(equip => {
                    if (equip.utilityMeterGroupId == meterGroup.guid) {
                        equip.utilityData.forEach(ud => {
                            ud.energyUse.forEach(eu => {
                                if (eu.year == year) {
                                    let energyUseUnits: string = getEnergyUseUnit(ud.units);
                                    let siteToSource: number = 1;
                                    if (ud.energySource == 'Electricity' && energyUseUnits != 'MMBtu') {
                                        siteToSource = 3;
                                    }
                                    let convertedEnergyUse: number = new ConvertValue(eu.energyUse, energyUseUnits, facility.energyUnit).convertedValue;
                                    equipmentEnergyUseData.push({
                                        equipmentGuid: equip.guid,
                                        equipmentName: equip.name,
                                        energyUse: convertedEnergyUse * siteToSource,
                                        percentOfTotal: 0
                                    });
                                }
                            });
                        });
                    }
                });
                let equipmentEnergyUseForYear: number = _.sumBy(equipmentEnergyUseData, (ed: { energyUse: number }) => { return ed.energyUse; });
                equipmentEnergyUseData.forEach(ed => {
                    let percentOfTotal: number = 0;
                    if (equipmentEnergyUseForYear != 0) {
                        percentOfTotal = (ed.energyUse / equipmentEnergyUseForYear) * 100;
                    }
                    ed.percentOfTotal = percentOfTotal;
                });
                let percentIncludedEnergyUse: number = 0;
                if (includedMetersEnergyUse != 0) {
                    percentIncludedEnergyUse = (equipmentEnergyUseForYear / includedMetersEnergyUse) * 100;
                }
                annualResults.push({
                    year: year,
                    totalEquipmentEnergyUse: equipmentEnergyUseForYear,
                    equipmentEnergyUse: equipmentEnergyUseData,
                    percentTotalEnergyUse: 0,
                    includedMetersEnergyUse: includedMetersEnergyUse,
                    totalSourceEnergyUse: 0,
                    percentIncludedEnergyUse: percentIncludedEnergyUse
                });
            });
            this.meterGroupsAnnualResults.push({
                meterGroupId: meterGroup.guid,
                meterGroupName: meterGroup.name,
                annualResults: annualResults
            });
        });
    }


    orderResults() {
        this.includedSourcesAnnualResults.forEach(sourceResults => {
            sourceResults.annualSourceResults = _.sortBy(sourceResults.annualSourceResults, 'year', 'desc');
        });
        this.meterGroupsAnnualResults.forEach(meterGroupResults => {
            meterGroupResults.annualResults = _.sortBy(meterGroupResults.annualResults, 'year', 'desc');
        });
    }

    getGroupCalanderizedMeters(calanderizedMeters: Array<CalanderizedMeter>, utilityMeterGroups: Array<IdbUtilityMeterGroup>): Array<CalanderizedMeter> {
        let groupMetersIds: Array<string> = new Array();
        this.meterGroups = new Array();
        this.groupEquipment.forEach(equip => {
            if (equip.utilityMeterGroupId) {
                let meterGroup: IdbUtilityMeterGroup = utilityMeterGroups.find(umg => umg.guid == equip.utilityMeterGroupId);
                this.meterGroups.push({ guid: equip.utilityMeterGroupId, name: meterGroup.name });
                let cMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => cm.meter.groupId == equip.utilityMeterGroupId);
                let cMeterIds: Array<string> = cMeters.map(cm => cm.meter.guid);
                groupMetersIds = groupMetersIds.concat(cMeterIds);
            }
        });
        let uniqueGroupMeterIds: Array<string> = _.uniq(groupMetersIds);
        let groupMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => uniqueGroupMeterIds.includes(cm.meter.guid));
        this.meterGroups = _.uniqBy(this.meterGroups, 'guid');
        return groupMeters;
    }
}

export interface AnnualFootprintGroupSourceResult {
    year: number,
    includedMetersEnergyUse: number,
    totalSourceEnergyUse: number,
    totalEquipmentEnergyUse: number,
    percentIncludedEnergyUse: number,
    percentTotalEnergyUse: number,
    equipmentEnergyUse: Array<{
        equipmentGuid: string,
        equipmentName: string,
        energyUse: number,
        percentOfTotal: number
    }>,
}
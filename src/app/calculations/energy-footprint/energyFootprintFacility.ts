import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { IdbFacilityEnergyUseGroup } from "src/app/models/idbModels/facilityEnergyUseGroups";
import { EnergyFootprintGroup } from "./energyFootprintGroup";
import * as _ from 'lodash';
import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbUtilityMeterGroup } from "src/app/models/idbModels/utilityMeterGroup";
import { MeterSource } from "src/app/models/constantsAndTypes";
import { AnnualFootprintGroupSourceResult } from "./energyFootprintModels";

export class EnergyFootprintFacility {

    footprintGroups: Array<EnergyFootprintGroup> = [];
    includedSourcesAnnualResults: Array<{
        source: MeterSource,
        showGroupResults: boolean,
        groupResults: Array<{
            groupName: string,
            groupId: string,
            color: string,
            annualSourceResults: Array<AnnualFootprintGroupSourceResult>
        }>
        annualTotals: Array<{
            totalEquipmentEnergyUse: number,
            totalFacilityEnergyUse: number,
            percentOfFacilityUse: number,
            year: number
        }>
    }>;

    meterGroupsAnnualResults: Array<{
        meterGroupId: string,
        meterGroupName: string,
        annualResults: Array<AnnualFootprintGroupSourceResult>,
        showGroupResults: boolean,
        energyUseGroupAnnualResults: Array<{
            groupGuid: string,
            groupName: string,
            color: string,
            annualResults: Array<{
                year: number,
                energyUse: number,
                percentOfTotal: number
            }>
        }>;
    }> = [];
    constructor(facility: IdbFacility, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>,
        calanderizedMeters: Array<CalanderizedMeter>, utilityMeterGroups: Array<IdbUtilityMeterGroup>) {
        this.setEnergyFootprintGroups(facility, energyUseGroups, equipment, calanderizedMeters, utilityMeterGroups);
        this.setIncludedSourcesAnnualResults(calanderizedMeters);
        this.setMeterGroupsAnnualResults();
    }

    setEnergyFootprintGroups(facility: IdbFacility, energyUseGroups: Array<IdbFacilityEnergyUseGroup>, equipment: Array<IdbFacilityEnergyUseEquipment>,
        calanderizedMeters: Array<CalanderizedMeter>, utilityMeterGroups: Array<IdbUtilityMeterGroup>) {
        energyUseGroups.forEach(group => {
            let groupEquipment: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.energyUseGroupId == group.guid);
            let footprintGroup: EnergyFootprintGroup = new EnergyFootprintGroup(group, groupEquipment, facility, calanderizedMeters, utilityMeterGroups);
            this.footprintGroups.push(footprintGroup);
        });
    }

    setIncludedSourcesAnnualResults(calanderizedMeters: Array<CalanderizedMeter>) {
        let allSources: Array<MeterSource> = this.footprintGroups.flatMap(group => group.includedSources);
        let uniqueSources: Array<MeterSource> = _.uniq(allSources);
        let years: Array<number> = this.footprintGroups.flatMap(group => group.includedSourcesAnnualResults.flatMap(s => s.annualSourceResults.map(r => r.year)));
        years = _.uniq(years).sort((a, b) => a - b);
        this.includedSourcesAnnualResults = new Array();
        uniqueSources.forEach(source => {
            let groupResults: Array<{
                groupName: string,
                groupId: string,
                color: string,
                annualSourceResults: Array<AnnualFootprintGroupSourceResult>
            }> = new Array();
            this.footprintGroups.forEach(group => {
                let sourceResult = group.includedSourcesAnnualResults.find(s => s.source == source);
                if (sourceResult) {
                    let sourceResultYears: Array<number> = sourceResult.annualSourceResults.map(r => r.year);
                    //make sure all years are represented
                    years.forEach(year => {
                        if (!sourceResultYears.includes(year)) {
                            sourceResult.annualSourceResults.push({
                                year: year,
                                includedMetersEnergyUse: 0,
                                totalSourceEnergyUse: 0,
                                totalEquipmentEnergyUse: 0,
                                percentIncludedEnergyUse: 0,
                                percentTotalEnergyUse: 0,
                                equipmentEnergyUse: [],
                            });
                        }
                        //order years
                        sourceResult.annualSourceResults = _.sortBy(sourceResult.annualSourceResults, ['year'], 'desc');
                    });
                    groupResults.push({
                        groupName: group.groupName,
                        groupId: group.groupId,
                        color: group.color,
                        annualSourceResults: sourceResult.annualSourceResults
                    });
                }
            });
            //calculate annual totals
            let annualTotals: Array<{
                totalEquipmentEnergyUse: number,
                totalFacilityEnergyUse: number,
                percentOfFacilityUse: number,
                year: number
            }> = new Array();
            if (groupResults.length > 0) {
                years.forEach(year => {
                    let totalEquipmentEnergyUse: number = 0;
                    groupResults.forEach(gr => {
                        let yearResult = gr.annualSourceResults.find(r => r.year == year);
                        if (yearResult) {
                            totalEquipmentEnergyUse += yearResult.totalEquipmentEnergyUse;
                        }
                    });
                    let totalSourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cm => cm.meter.source == source);
                    let totalMonthlyDataForSourceAndYear: Array<MonthlyData> = totalSourceMeters.flatMap(cm => cm.monthlyData.filter(md => md.year == year));
                    let totalSourceEnergyUse: number = _.sumBy(totalMonthlyDataForSourceAndYear, (mData: MonthlyData) => { return mData.energyUse; });
                    let percentOfFacilityUse: number = totalSourceEnergyUse > 0 ? (totalEquipmentEnergyUse / totalSourceEnergyUse) * 100 : 0;
                    annualTotals.push({
                        totalEquipmentEnergyUse: totalEquipmentEnergyUse,
                        totalFacilityEnergyUse: totalSourceEnergyUse,
                        percentOfFacilityUse: percentOfFacilityUse,
                        year: year
                    });
                });
            }
            this.includedSourcesAnnualResults.push({
                source: source,
                showGroupResults: false,
                groupResults: groupResults,
                annualTotals: annualTotals
            });
        });
    }

    setMeterGroupsAnnualResults() {
        let includedGroups: Array<{ guid: string, name: string }> = this.footprintGroups.flatMap(group => group.meterGroups);
        let uniqueMeterGroups: Array<{ guid: string, name: string }> = _.uniqBy(includedGroups, 'guid');
        let years: Array<number> = this.footprintGroups.flatMap(group => group.meterGroupsAnnualResults.flatMap(s => s.annualResults.map(r => r.year)));
        years = _.uniq(years).sort((a, b) => a - b);

        this.meterGroupsAnnualResults = new Array();
        uniqueMeterGroups.forEach(meterGroup => {
            let meterGroupResult: {
                meterGroupId: string,
                meterGroupName: string,
                annualResults: Array<AnnualFootprintGroupSourceResult>,
                showGroupResults: boolean,
                energyUseGroupAnnualResults: Array<{
                    groupGuid: string,
                    groupName: string,
                    color: string,
                    annualResults: Array<{
                        year: number,
                        energyUse: number,
                        percentOfTotal: number
                    }>
                }>;
            } = {
                meterGroupId: meterGroup.guid,
                meterGroupName: meterGroup.name,
                showGroupResults: false,
                annualResults: new Array(),
                energyUseGroupAnnualResults: new Array(),
            };

            this.footprintGroups.forEach(group => {
                let footprintGroupResults: Array<{ annualResults: Array<AnnualFootprintGroupSourceResult> }> = group.meterGroupsAnnualResults.filter(s => s.meterGroupId == meterGroup.guid);
                let footprintToolGroupAnnualResults: Array<AnnualFootprintGroupSourceResult> = footprintGroupResults.flatMap(r => r.annualResults);
                if (footprintToolGroupAnnualResults.length > 0) {
                    //make sure all years are represented
                    years.forEach(year => {
                        let yearIndex: number = meterGroupResult.annualResults.findIndex(r => r.year == year);
                        if (yearIndex != -1) {
                            //update existing year result
                            let yearResults: Array<AnnualFootprintGroupSourceResult> = footprintToolGroupAnnualResults.filter(r => r.year == year);
                            let totalEquipmentEnergyUse: number = _.sumBy(yearResults, (yearResult: AnnualFootprintGroupSourceResult) => { return yearResult.totalEquipmentEnergyUse });
                            meterGroupResult.annualResults[yearIndex].totalEquipmentEnergyUse += totalEquipmentEnergyUse;
                            meterGroupResult.annualResults[yearIndex].percentIncludedEnergyUse = meterGroupResult.annualResults[yearIndex].includedMetersEnergyUse > 0 ?
                                (meterGroupResult.annualResults[yearIndex].totalEquipmentEnergyUse / meterGroupResult.annualResults[yearIndex].includedMetersEnergyUse) * 100 : 0;

                        } else {
                            let yearResults: Array<AnnualFootprintGroupSourceResult> = footprintToolGroupAnnualResults.filter(r => r.year == year);
                            let totalEquipmentEnergyUse: number = _.sumBy(yearResults, (yearResult: AnnualFootprintGroupSourceResult) => { return yearResult.totalEquipmentEnergyUse });
                            //
                            let totalSourceEnergyUse: number = 0;
                            let includedMetersEnergyUse: number = yearResults[0].includedMetersEnergyUse;
                            let percentTotalEnergyUse: number = 0;
                            let percentIncludedEnergyUse: number = includedMetersEnergyUse > 0 ? (totalEquipmentEnergyUse / includedMetersEnergyUse) * 100 : 0;
                            meterGroupResult.annualResults.push({
                                year: year,
                                includedMetersEnergyUse: includedMetersEnergyUse,
                                totalSourceEnergyUse: totalSourceEnergyUse,
                                totalEquipmentEnergyUse: totalEquipmentEnergyUse,
                                percentIncludedEnergyUse: percentIncludedEnergyUse,
                                percentTotalEnergyUse: percentTotalEnergyUse,
                                equipmentEnergyUse: [],
                            });
                        }

                    });
                    let ftgAnnualResults = footprintToolGroupAnnualResults.map(yearResult => {
                        return {
                            year: yearResult.year,
                            energyUse: yearResult.totalEquipmentEnergyUse,
                            percentOfTotal: yearResult.percentIncludedEnergyUse
                        }
                    });
                    //check missing year
                    years.forEach(year => {
                        if (!ftgAnnualResults.find(ar => ar.year == year)) {
                            ftgAnnualResults.push({
                                year: year,
                                energyUse: 0,
                                percentOfTotal: 0
                            });
                        }
                    });

                    meterGroupResult.energyUseGroupAnnualResults.push({
                        groupGuid: group.groupId,
                        groupName: group.groupName,
                        color: group.color,
                        annualResults: ftgAnnualResults,
                    })
                }
            });
            //order years
            meterGroupResult.annualResults = _.sortBy(meterGroupResult.annualResults, ['year'], 'desc');
            meterGroupResult.energyUseGroupAnnualResults.forEach(eugr => {
                eugr.annualResults = _.sortBy(eugr.annualResults, ['year'], 'desc');
            });
            this.meterGroupsAnnualResults.push(meterGroupResult);
        });
    }
}
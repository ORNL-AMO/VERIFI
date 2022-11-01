import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { FacilityMeterSummaryData, MeterSummary } from "src/app/models/dashboard";
import { IdbUtilityMeterGroup, MeterSource } from "src/app/models/idb";
import { getLastBillEntryFromCalanderizedMeterData, getPastYearData, getSumValue, LastYearDataResult } from "../helper-functions/calanderizationFunctions";
import * as _ from 'lodash';

export class FacilitySummaryClass {

    meterSummaryData: FacilityMeterSummaryData;

    constructor(calanderizedMeters: Array<CalanderizedMeter>, groups: Array<IdbUtilityMeterGroup>, sources: Array<MeterSource>) {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return sources.includes(cMeter.meter.source) });
        let allMetersLastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(sourceMeters);
        this.meterSummaryData = this.getDashboardFacilityMeterSummary(sourceMeters, allMetersLastBill, groups);
    };

    getDashboardFacilityMeterSummary(calanderizedMeters: Array<CalanderizedMeter>, lastBill: MonthlyData, groups: Array<IdbUtilityMeterGroup>): FacilityMeterSummaryData {
        let facilityMetersSummary: Array<MeterSummary> = new Array();
        // let allMetersLastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
        calanderizedMeters.forEach(cMeter => {
            let summary: MeterSummary = this.getDashboardMeterSummary(cMeter, lastBill, groups);
            facilityMetersSummary.push(summary);
        });

        let totalEnergyUse: number = 0;
        let totalEnergyCost: number = 0;
        let totalMarketEmissions: number = 0;
        let totalLocationEmissions: number = 0;
        let totalConsumption: number = 0;
        for (let i = 0; i < facilityMetersSummary.length; i++) {
            totalEnergyUse += facilityMetersSummary[i].energyUsage;
            totalEnergyCost += facilityMetersSummary[i].energyCost;
            totalMarketEmissions += facilityMetersSummary[i].marketEmissions;
            totalLocationEmissions += facilityMetersSummary[i].locationEmissions;
            totalConsumption += facilityMetersSummary[i].consumption;
        }

        return {
            meterSummaries: facilityMetersSummary,
            totalEnergyUse: totalEnergyUse,
            totalEnergyCost: totalEnergyCost,
            totalMarketEmissions: totalMarketEmissions,
            totalLocationEmissions: totalLocationEmissions,
            totalConsumption: totalConsumption,
            allMetersLastBill: lastBill
        };
    }

    getDashboardMeterSummary(cMeter: CalanderizedMeter, allMetersLastBill: MonthlyData, groups: Array<IdbUtilityMeterGroup>): MeterSummary {
        let lastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData([cMeter]);
        let lastYearData: LastYearDataResult = getPastYearData(allMetersLastBill, [cMeter]);
        let group: IdbUtilityMeterGroup = groups.find(group => { return group.guid == cMeter.meter.groupId });
        let groupName: string = 'Ungrouped';
        if (group) {
            groupName = group.name;
        }
        let lastBillDate: Date;
        if (lastBill) {
            lastBillDate = new Date(lastBill.year, lastBill.monthNumValue + 1);
        }

        return {
            meter: cMeter.meter,
            energyUsage: lastYearData.energyUsage,
            energyCost: lastYearData.energyCost,
            marketEmissions: lastYearData.marketEmissions,
            locationEmissions: lastYearData.locationEmissions,
            consumption: lastYearData.consumption,
            lastBill: lastBill,
            groupName: groupName,
            lastBillDate: lastBillDate
        }
    }
}
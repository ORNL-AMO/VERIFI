import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { FacilityMeterSummaryData, MeterSummary, UtilityUsageSummaryData, YearMonthData } from "src/app/models/dashboard";
import { IdbFacility, IdbUtilityMeterGroup, MeterSource } from "src/app/models/idb";
import { getFiscalYear, getLastBillEntryFromCalanderizedMeterData, getPastYearData, getUtilityUsageSummaryData, getYearlyUsageNumbers, LastYearDataResult } from "../shared-calculations/calanderizationFunctions";
import * as _ from 'lodash';
import { FacilityBarChartData } from "src/app/models/visualization";

export class FacilitySummaryClass {

    meterSummaryData: FacilityMeterSummaryData;
    monthlySourceData: Array<{
        source: MeterSource,
        data: Array<FacilityBarChartData>
    }>;
    utilityUsageSummaryData: UtilityUsageSummaryData;
    yearMonthData: Array<YearMonthData>;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, groups: Array<IdbUtilityMeterGroup>, sources: Array<MeterSource>, facility: IdbFacility) {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return sources.includes(cMeter.meter.source) });
        let allMetersLastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(sourceMeters);
        this.meterSummaryData = this.getDashboardFacilityMeterSummary(sourceMeters, allMetersLastBill, groups);
        this.monthlySourceData = this.getMonthlySourceData(sourceMeters, sources,facility);
        this.utilityUsageSummaryData = getUtilityUsageSummaryData(sourceMeters, allMetersLastBill, sources);
        this.yearMonthData = getYearlyUsageNumbers(sourceMeters, facility);
    };

    getDashboardFacilityMeterSummary(calanderizedMeters: Array<CalanderizedMeter>, lastBill: MonthlyData, groups: Array<IdbUtilityMeterGroup>): FacilityMeterSummaryData {
        let facilityMetersSummary: Array<MeterSummary> = new Array();
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


    getMonthlySourceData(calanderizedMeters: Array<CalanderizedMeter>, sources: Array<MeterSource>, facility: IdbFacility): Array<{
        source: MeterSource,
        data: Array<FacilityBarChartData>
    }> {
        let monthlySourceData: Array<{
            source: MeterSource,
            data: Array<FacilityBarChartData>
        }> = new Array();
        sources.forEach(source => {
            let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.source == source });
            let monthlyData: Array<MonthlyData> = sourceMeters.flatMap(cMeter => { return cMeter.monthlyData });
            let yearMonths: Array<{ year: number, month: string, monthNumValue: number }> = monthlyData.map(data => { return { year: data.year, month: data.month, monthNumValue: data.monthNumValue } });
            
            yearMonths = _.uniqWith(yearMonths, (a, b) => {
                return (a.year == b.year && a.month == b.month)
            });
            let data: Array<FacilityBarChartData> = new Array();
            for (let i = 0; i < yearMonths.length; i++) {
                let yearMonth: { year: number, month: string, monthNumValue: number } = yearMonths[i];
                let totalEnergyUse: number = 0;
                let totalEnergyCost: number = 0;
                let totalLocationEmissions: number = 0;
                let totalMarketEmissions: number = 0;
                let totalConsumption: number = 0;
                for (let x = 0; x < monthlyData.length; x++) {
                    if (monthlyData[x].year == yearMonth.year && monthlyData[x].month == yearMonth.month) {
                        totalEnergyUse += monthlyData[x].energyUse;
                        totalEnergyCost += monthlyData[x].energyCost;
                        totalLocationEmissions += monthlyData[x].locationEmissions;
                        totalMarketEmissions += monthlyData[x].marketEmissions;
                        totalConsumption += monthlyData[x].energyConsumption;
                    }
                }

                let date: Date = new Date(yearMonth.year, yearMonth.monthNumValue, 1)
                let fiscalYear: number = getFiscalYear(date, facility);
                data.push({
                    time: yearMonth.month + ', ' + yearMonth.year,
                    energyUse: totalEnergyUse,
                    energyCost: totalEnergyCost,
                    locationEmissions: totalLocationEmissions,
                    marketEmissions: totalMarketEmissions,
                    year: yearMonth.year,
                    consumption: totalConsumption,
                    fiscalYear: fiscalYear
                })
            }
            monthlySourceData.push({
                source: source,
                data: data
            });
        });

        return monthlySourceData;
    }
}
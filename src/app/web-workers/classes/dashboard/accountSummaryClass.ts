import { CalanderizedMeter, LastYearData, MonthlyData } from "src/app/models/calanderization";
import { AccountFacilitiesSummary, FacilitySummary, SummaryData, UtilityUsageSummaryData } from "src/app/models/dashboard";
import { IdbFacility, MeterSource } from "src/app/models/idb";
import * as _ from 'lodash';
import { getLastBillEntryFromCalanderizedMeterData, getPastYearData, getSumValue, getUtilityUsageSummaryData, getYearPriorBillEntryFromCalanderizedMeterData } from "../helper-functions/calanderizationFunctions";


export class AccountSummaryClass {

    facilitiesSummary: AccountFacilitiesSummary
    utilityUsageSummaryData: UtilityUsageSummaryData;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, sources: Array<MeterSource>) {
        let filteredSourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(meter => {return sources.includes(meter.meter.source)})
        this.facilitiesSummary = this.calculateFacilitiesSummary(filteredSourceMeters, facilities);
        this.utilityUsageSummaryData = getUtilityUsageSummaryData(filteredSourceMeters, this.facilitiesSummary.allMetersLastBill, sources);
    }

    calculateFacilitiesSummary(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>): AccountFacilitiesSummary {
        let facilitiesSummary: Array<FacilitySummary> = new Array();
        let accountLastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
        let totalEnergyUse: number = 0;
        let totalEnergyCost: number = 0;
        let totalNumberOfMeters: number = 0;
        let totalMarketEmissions: number = 0;
        let totalLocationEmissions: number = 0;
        let totalConsumption: number = 0;


        if (accountLastBill) {
            facilities.forEach(facility => {
                let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
                if (facilityMeters.length != 0) {
                    let facilityLastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(facilityMeters);
                    let facilityMetersDataSummary: {
                        yearData: Array<LastYearData>,
                        energyUsage: number,
                        energyCost: number,
                        marketEmissions: number,
                        locationEmissions: number,
                        consumption: number
                    } = getPastYearData(accountLastBill, facilityMeters);
                    let numberOfMeters: number = facilityMeters.length;
                    totalEnergyUse += facilityMetersDataSummary.energyUsage;
                    totalEnergyCost += facilityMetersDataSummary.energyCost;
                    totalNumberOfMeters += numberOfMeters;
                    totalMarketEmissions += facilityMetersDataSummary.marketEmissions;
                    totalLocationEmissions += facilityMetersDataSummary.locationEmissions;
                    totalConsumption += facilityMetersDataSummary.consumption;
                    facilitiesSummary.push({
                        facility: facility,
                        energyUsage: facilityMetersDataSummary.energyUsage,
                        energyCost: facilityMetersDataSummary.energyCost,
                        marketEmissions: facilityMetersDataSummary.marketEmissions,
                        locationEmissions: facilityMetersDataSummary.locationEmissions,
                        consumption: facilityMetersDataSummary.consumption,
                        numberOfMeters: numberOfMeters,
                        lastBillDate: new Date(facilityLastBill.year, (facilityLastBill.monthNumValue + 1))
                    })
                }
            })
        }
        return {
            facilitySummaries: facilitiesSummary,
            totalEnergyUse: totalEnergyUse,
            totalEnergyCost: totalEnergyCost,
            totalNumberOfMeters: totalNumberOfMeters,
            totalMarketEmissions: totalMarketEmissions,
            totalLocationEmissions: totalLocationEmissions,
            totalConsumption: totalConsumption,
            allMetersLastBill: accountLastBill
        };

    }

    // calculateAccountUtilityUsageSummary(calanderizedMeters: Array<CalanderizedMeter>, allMetersLastBill: MonthlyData, sources: Array<MeterSource>): UtilityUsageSummaryData {
    //     let accountUtilitySummaries: Array<SummaryData> = new Array();

    //     sources.forEach(source => {
    //         let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.source == source });
    //         if (sourceMeters.length != 0) {
    //             let pastYearData: {
    //                 yearData: Array<LastYearData>,
    //                 energyUsage: number,
    //                 energyCost: number,
    //                 marketEmissions: number,
    //                 locationEmissions: number
    //             } = getPastYearData(allMetersLastBill, sourceMeters);
    //             let yearPriorBill: Array<MonthlyData> = getYearPriorBillEntryFromCalanderizedMeterData(sourceMeters, allMetersLastBill);
    //             let lastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(sourceMeters)
    //             if (lastBill) {
    //                 let previousMonthData: LastYearData = _.maxBy(pastYearData.yearData, 'date');
    //                 let totalEnergyUseFromLastYear: number = 0;
    //                 let totalEnergyCostFromLastYear: number = 0;
    //                 let totalMarketEmissionsFromLastYear: number = 0;
    //                 let totalLocationEmissionsFromLastYear: number = 0;
    //                 let totalConsumptionFromLastYear: number = 0;
    //                 for (let i = 0; i < pastYearData.yearData.length; i++) {
    //                     totalEnergyUseFromLastYear += getSumValue(pastYearData.yearData[i].energyUse);
    //                     totalEnergyCostFromLastYear += getSumValue(pastYearData.yearData[i].energyCost);
    //                     totalMarketEmissionsFromLastYear += getSumValue(pastYearData.yearData[i].marketEmissions);
    //                     totalLocationEmissionsFromLastYear += getSumValue(pastYearData.yearData[i].locationEmissions);
    //                     totalConsumptionFromLastYear += getSumValue(pastYearData.yearData[i].energyConsumption);
    //                 }
    //                 let yearPriorEnergyCost: number = 0;
    //                 let yearPriorEnergyUse: number = 0;
    //                 let yearPriorMarketEmissions: number = 0;
    //                 let yearPriorLocationEmissions: number = 0;
    //                 let yearPriorConsumption: number = 0;
    //                 for (let i = 0; i < yearPriorBill.length; i++) {
    //                     yearPriorEnergyCost += getSumValue(yearPriorBill[i].energyCost);
    //                     yearPriorEnergyUse += getSumValue(yearPriorBill[i].energyUse);
    //                     yearPriorMarketEmissions += getSumValue(yearPriorBill[i].marketEmissions);
    //                     yearPriorLocationEmissions += getSumValue(yearPriorBill[i].locationEmissions);
    //                     yearPriorConsumption += getSumValue(yearPriorBill[i].energyConsumption);
    //                 }


    //                 let previousMonthMarketEmissions: number = previousMonthData.marketEmissions;
    //                 let marketEmissionsChangeSinceLastYear: number = previousMonthData.marketEmissions - yearPriorMarketEmissions;

    //                 let previousMonthLocationEmissions: number = previousMonthData.locationEmissions;
    //                 let locationEmissionsChangeSinceLastYear: number = previousMonthData.locationEmissions - yearPriorLocationEmissions;


    //                 let previousMonthConsumption: number = previousMonthData.energyConsumption;
    //                 let consumptionChangeSinceLastYear: number = previousMonthData.energyConsumption - yearPriorConsumption;
    //                 accountUtilitySummaries.push({
    //                     lastBillDate: new Date(lastBill.date),
    //                     previousMonthEnergyUse: previousMonthData.energyUse,
    //                     previousMonthEnergyCost: previousMonthData.energyCost,
    //                     previousMonthConsumption: previousMonthConsumption,
    //                     previousMonthMarketEmissions: previousMonthMarketEmissions,
    //                     previousMonthLocationEmissions: previousMonthLocationEmissions,
    //                     averageEnergyUse: (totalEnergyUseFromLastYear / pastYearData.yearData.length),
    //                     averageEnergyCost: (totalEnergyCostFromLastYear / pastYearData.yearData.length),
    //                     averageConsumption: (totalConsumptionFromLastYear / pastYearData.yearData.length),
    //                     averageLocationEmissions: (totalLocationEmissionsFromLastYear / pastYearData.yearData.length),
    //                     averageMarketEmissions: (totalMarketEmissionsFromLastYear / pastYearData.yearData.length),
    //                     yearPriorEnergyCost: yearPriorEnergyCost,
    //                     yearPriorEnergyUse: yearPriorEnergyUse,
    //                     yearPriorConsumption: yearPriorConsumption,
    //                     yearPriorMarketEmissions: yearPriorMarketEmissions,
    //                     yearPriorLocationEmissions: yearPriorLocationEmissions,
    //                     energyCostChangeSinceLastYear: previousMonthData.energyCost - yearPriorEnergyCost,
    //                     energyUseChangeSinceLastYear: previousMonthData.energyUse - yearPriorEnergyUse,
    //                     locationEmissionsChangeSinceLastYear: locationEmissionsChangeSinceLastYear,
    //                     marketEmissionsChangeSinceLastYear: marketEmissionsChangeSinceLastYear,
    //                     consumptionChangeSinceLastYear: consumptionChangeSinceLastYear,
    //                     utility: source
    //                 });
    //             }
    //         }
    //     });


    //     let previousMonthEnergyUse: number = 0;
    //     let previousMonthEnergyCost: number = 0;
    //     let previousMonthMarketEmissions: number = 0;
    //     let previousMonthLocationEmissions: number = 0;
    //     let previousMonthConsumption: number = 0;
    //     let yearPriorEnergyUse: number = 0;
    //     let yearPriorEnergyCost: number = 0;
    //     let yearPriorMarketEmissions: number = 0;
    //     let yearPriorLocationEmissions: number = 0;
    //     let yearPriorConsumption: number = 0;
    //     let averageEnergyUse: number = 0;
    //     let averageEnergyCost: number = 0;
    //     let averageLocationEmissions: number = 0;
    //     let averageMarketEmissions: number = 0;
    //     let averageConsumption: number = 0;
    //     for (let i = 0; i < accountUtilitySummaries.length; i++) {
    //         previousMonthEnergyUse += getSumValue(accountUtilitySummaries[i].previousMonthEnergyUse);
    //         previousMonthEnergyCost += getSumValue(accountUtilitySummaries[i].previousMonthEnergyCost);
    //         previousMonthMarketEmissions += getSumValue(accountUtilitySummaries[i].previousMonthMarketEmissions);
    //         previousMonthLocationEmissions += getSumValue(accountUtilitySummaries[i].previousMonthLocationEmissions);
    //         previousMonthConsumption += getSumValue(accountUtilitySummaries[i].previousMonthConsumption);
    //         yearPriorEnergyUse += getSumValue(accountUtilitySummaries[i].yearPriorEnergyUse);
    //         yearPriorEnergyCost += getSumValue(accountUtilitySummaries[i].yearPriorEnergyCost);
    //         yearPriorMarketEmissions += getSumValue(accountUtilitySummaries[i].yearPriorMarketEmissions);
    //         yearPriorLocationEmissions += getSumValue(accountUtilitySummaries[i].yearPriorLocationEmissions);
    //         yearPriorConsumption += getSumValue(accountUtilitySummaries[i].yearPriorConsumption);
    //         averageEnergyUse += getSumValue(accountUtilitySummaries[i].averageEnergyUse);
    //         averageEnergyCost += getSumValue(accountUtilitySummaries[i].averageEnergyCost);
    //         averageLocationEmissions += getSumValue(accountUtilitySummaries[i].averageLocationEmissions);
    //         averageMarketEmissions += getSumValue(accountUtilitySummaries[i].averageMarketEmissions);
    //         averageConsumption += getSumValue(accountUtilitySummaries[i].averageConsumption);
    //     }

    //     return {
    //         utilitySummaries: accountUtilitySummaries,
    //         total: {
    //             lastBillDate: _.maxBy(accountUtilitySummaries, 'lastBillDate'),
    //             previousMonthEnergyUse: previousMonthEnergyUse,
    //             previousMonthEnergyCost: previousMonthEnergyCost,
    //             previousMonthLocationEmissions: previousMonthLocationEmissions,
    //             previousMonthMarketEmissions: previousMonthMarketEmissions,
    //             previousMonthConsumption: previousMonthConsumption,
    //             averageEnergyUse: averageEnergyUse,
    //             averageEnergyCost: averageEnergyCost,
    //             averageLocationEmissions: averageLocationEmissions,
    //             averageMarketEmissions: averageMarketEmissions,
    //             averageConsumption: averageConsumption,
    //             yearPriorEnergyUse: yearPriorEnergyUse,
    //             yearPriorEnergyCost: yearPriorEnergyCost,
    //             yearPriorLocationEmissions: yearPriorLocationEmissions,
    //             yearPriorMarketEmissions: yearPriorMarketEmissions,
    //             yearPriorConsumption: yearPriorConsumption,
    //             energyCostChangeSinceLastYear: previousMonthEnergyCost - yearPriorEnergyCost,
    //             energyUseChangeSinceLastYear: previousMonthEnergyUse - yearPriorEnergyUse,
    //             locationEmissionsChangeSinceLastYear: previousMonthLocationEmissions - yearPriorLocationEmissions,
    //             marketEmissionsChangeSinceLastYear: previousMonthMarketEmissions - yearPriorMarketEmissions,
    //             consumptionChangeSinceLastYear: previousMonthConsumption - yearPriorConsumption,
    //             utility: 'Total'
    //         },
    //         allMetersLastBill: allMetersLastBill
    //     }
    // }
}
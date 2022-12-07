import { CalanderizedMeter, LastYearData, MonthlyData } from "src/app/models/calanderization";
import { AccountFacilitiesSummary, FacilitySummary, YearMonthData, UtilityUsageSummaryData } from "src/app/models/dashboard";
import { IdbAccount, IdbFacility, MeterSource } from "src/app/models/idb";
import * as _ from 'lodash';
import { getLastBillEntryFromCalanderizedMeterData, getPastYearData, getUtilityUsageSummaryData, getYearlyUsageNumbers } from "../shared-calculations/calanderizationFunctions";


export class AccountSummaryClass {

    facilitiesSummary: AccountFacilitiesSummary
    utilityUsageSummaryData: UtilityUsageSummaryData;
    yearMonthData: Array<YearMonthData>;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, sources: Array<MeterSource>, account: IdbAccount) {
        let filteredSourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(meter => { return sources.includes(meter.meter.source) })
        this.facilitiesSummary = this.calculateFacilitiesSummary(filteredSourceMeters, facilities);
        this.utilityUsageSummaryData = getUtilityUsageSummaryData(filteredSourceMeters, this.facilitiesSummary.allMetersLastBill, sources);
        this.yearMonthData = getYearlyUsageNumbers(filteredSourceMeters, account);
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


   

}

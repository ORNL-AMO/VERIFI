import { CalanderizedMeter, LastYearData, MonthlyData } from "src/app/models/calanderization";
import { AccountFacilitiesSummary, FacilitySummary } from "src/app/models/dashboard";
import { IdbFacility } from "src/app/models/idb";
import * as _ from 'lodash';
import { getLastBillEntryFromCalanderizedMeterData, getPastYearData, getSumValue } from "../helper-functions/calanderizationFunctions";


export class AccountFacilitiesSummaryClass {

    summary: AccountFacilitiesSummary
    constructor(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>) {
        this.summary = this.calculateFacilitiesSummary(calanderizedMeters, facilities);
    }
    
    calculateFacilitiesSummary(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>): AccountFacilitiesSummary {
        let facilitiesSummary: Array<FacilitySummary> = new Array();
        let accountLastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
        let totalEnergyUse: number = 0;
        let totalEnergyCost: number = 0;
        let totalNumberOfMeters: number = 0;
        let totalMarketEmissions: number = 0;
        let totalLocationEmissions: number = 0;


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
                        locationEmissions: number
                    } = getPastYearData(accountLastBill, facilityMeters);
                    let numberOfMeters: number = facilityMeters.length;
                    totalEnergyUse += facilityMetersDataSummary.energyUsage;
                    totalEnergyCost += facilityMetersDataSummary.energyCost;
                    totalNumberOfMeters += numberOfMeters;
                    totalMarketEmissions += facilityMetersDataSummary.marketEmissions;
                    totalLocationEmissions += facilityMetersDataSummary.locationEmissions;
                    facilitiesSummary.push({
                        facility: facility,
                        energyUsage: facilityMetersDataSummary.energyUsage,
                        energyCost: facilityMetersDataSummary.energyCost,
                        marketEmissions: facilityMetersDataSummary.marketEmissions,
                        locationEmissions: facilityMetersDataSummary.locationEmissions,
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
            allMetersLastBill: accountLastBill
        };

    }
}
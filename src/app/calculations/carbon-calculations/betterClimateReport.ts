import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import * as _ from 'lodash';
import { setEmissionsForCalanderizedMeters } from "../emissions-calculations/emissions";
import { SubregionEmissions } from "src/app/models/eGridEmissions";
import { BetterClimateYearDetails } from "./betterClimateYearsDetails";

export class BetterClimateReport {

    baselineYear: number;
    reportYear: number;
    portfolioYearDetails: Array<BetterClimateYearDetails>;
    annualFacilitiesSummaries: Array<BetterClimateAnnualFacilitySummary>;
    facilityMaxMins: Array<BetterClimateFacilityMaxMin>;
    constructor(account: IdbAccount, facilities: Array<IdbFacility>, meters: Array<IdbUtilityMeter>, meterData: Array<IdbUtilityMeterData>, baselineYear: number, reportYear: number,
        co2Emissions: Array<SubregionEmissions>, emissionsDisplay: 'market' | 'location', emissionsGoal: number) {
        this.baselineYear = baselineYear;
        this.reportYear = reportYear;
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, false, { energyIsSource: false, neededUnits: 'MMBtu' });
        calanderizedMeters = setEmissionsForCalanderizedMeters(calanderizedMeters, false, facilities, co2Emissions);


        this.setPortfolioYearDetails(calanderizedMeters, facilities, emissionsDisplay, emissionsGoal);
        this.setAnnualFacilitiesSummaries(calanderizedMeters, facilities, emissionsDisplay);
        // this.setFacilityTotals();
        this.setFacilityMaxMins();
    }

    setPortfolioYearDetails(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, emissionsDisplay: 'market' | 'location', emissionsGoal: number) {
        this.portfolioYearDetails = new Array();
        let baselineYearDetails: BetterClimateYearDetails;
        let previousYearDetails: BetterClimateYearDetails;
        for (let year = this.baselineYear; year <= this.reportYear; year++) {
            let betterClimateYearDetails: BetterClimateYearDetails = new BetterClimateYearDetails(year, calanderizedMeters, facilities, emissionsDisplay, baselineYearDetails, previousYearDetails, emissionsGoal, undefined);
            this.portfolioYearDetails.push(betterClimateYearDetails);
            previousYearDetails = betterClimateYearDetails;
            if (year == this.baselineYear) {
                baselineYearDetails = betterClimateYearDetails;
            }
        }
    }

    setAnnualFacilitiesSummaries(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, emissionsDisplay: 'market' | 'location') {
        this.annualFacilitiesSummaries = new Array();

        facilities.forEach(facility => {
            let betterClimateFacilities: Array<BetterClimateYearDetails> = new Array();
            let previousYearDetails: BetterClimateYearDetails;
            let baselineYearDetails: BetterClimateYearDetails;
            let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
            let emissionsGoal: number = 0;
            if (facility.sustainabilityQuestions.greenhouseReductionGoal) {
                emissionsGoal = facility.sustainabilityQuestions.greenhouseReductionPercent;
            }
            for (let year = this.baselineYear; year <= this.reportYear; year++) {
                let yearAccountDetails: BetterClimateYearDetails = this.portfolioYearDetails.find(pYearDetails => {
                    return pYearDetails.year == year;
                });
                let betterClimateFacility: BetterClimateYearDetails = new BetterClimateYearDetails(year, facilityMeters, [facility], emissionsDisplay, baselineYearDetails, previousYearDetails, emissionsGoal, yearAccountDetails);
                betterClimateFacilities.push(betterClimateFacility);
                if (year == this.baselineYear) {
                    baselineYearDetails = betterClimateFacility;
                }
                previousYearDetails = betterClimateFacility;
            }
            this.annualFacilitiesSummaries.push({
                facility: facility,
                betterClimateYearDetails: betterClimateFacilities
            })
        })
    }

    setFacilityMaxMins(){
        let allFacilityValues: Array<BetterClimateYearDetails> = this.annualFacilitiesSummaries.flatMap(summary => {
            return summary.betterClimateYearDetails;
        });
        this.facilityMaxMins = new Array();
        for (let year = this.baselineYear; year <= this.reportYear; year++) {
            let yearDetails: Array<BetterClimateYearDetails> = allFacilityValues.filter(value => {
                return value.year == year;
            });
            this.facilityMaxMins.push({
                year: year,
                scope1PercentReductions: {
                    max: _.maxBy(yearDetails, 'scope1PercentReductions').scope1PercentReductions,
                    min: _.minBy(yearDetails, 'scope1PercentReductions').scope1PercentReductions
                },
                scope1ReductionContribution: {
                    max: _.maxBy(yearDetails, 'scope1ReductionContribution').scope1ReductionContribution,
                    min: _.minBy(yearDetails, 'scope1ReductionContribution').scope1ReductionContribution
                },
                scope2MarketPercentReductions: {
                    max: _.maxBy(yearDetails, 'scope2MarketPercentReductions').scope2MarketPercentReductions,
                    min: _.minBy(yearDetails, 'scope2MarketPercentReductions').scope2MarketPercentReductions
                },
                scope2MarketReductionContribution: {
                    max: _.maxBy(yearDetails, 'scope2MarketReductionContribution').scope2MarketReductionContribution,
                    min: _.minBy(yearDetails, 'scope2MarketReductionContribution').scope2MarketReductionContribution
                },
                scope2LocationPercentReductions: {
                    max: _.maxBy(yearDetails, 'scope2LocationPercentReductions').scope2LocationPercentReductions,
                    min: _.minBy(yearDetails, 'scope2LocationPercentReductions').scope2LocationPercentReductions
                },
                scope2LocationReductionContribution: {
                    max: _.maxBy(yearDetails, 'scope2LocationReductionContribution').scope2LocationReductionContribution,
                    min: _.minBy(yearDetails, 'scope2LocationReductionContribution').scope2LocationReductionContribution
                },
            })
        }
    }

}


export interface BetterClimateAnnualFacilitySummary {
    facility: IdbFacility,
    betterClimateYearDetails: Array<BetterClimateYearDetails>
}

export interface BetterClimateFacilityMaxMin{
    year: number,
    scope1PercentReductions: {
        max: number,
        min: number
    },
    scope1ReductionContribution: {
        max: number,
        min: number
    },
    scope2MarketPercentReductions: {
        max: number,
        min: number
    },
    scope2MarketReductionContribution: {
        max: number,
        min: number
    },
    scope2LocationPercentReductions: {
        max: number,
        min: number
    },
    scope2LocationReductionContribution: {
        max: number,
        min: number
    },
}
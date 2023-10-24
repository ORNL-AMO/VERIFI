import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbCustomFuel, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
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
        co2Emissions: Array<SubregionEmissions>, emissionsDisplay: 'market' | 'location', emissionsGoal: number, customFuels: Array<IdbCustomFuel>) {
        this.baselineYear = baselineYear;
        this.reportYear = reportYear;
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, false, { energyIsSource: false, neededUnits: 'MMBtu' });
        calanderizedMeters = setEmissionsForCalanderizedMeters(calanderizedMeters, false, facilities, co2Emissions, customFuels);


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
                scope1ReductionContributionRelative: {
                    max: _.maxBy(yearDetails, 'scope1ReductionContributionRelative').scope1ReductionContributionRelative,
                    min: _.minBy(yearDetails, 'scope1ReductionContributionRelative').scope1ReductionContributionRelative
                },
                scope1ReductionContributionTotal: {
                    max: _.maxBy(yearDetails, 'scope1ReductionContributionTotal').scope1ReductionContributionTotal,
                    min: _.minBy(yearDetails, 'scope1ReductionContributionTotal').scope1ReductionContributionTotal
                },
                scope2MarketPercentReductions: {
                    max: _.maxBy(yearDetails, 'scope2MarketPercentReductions').scope2MarketPercentReductions,
                    min: _.minBy(yearDetails, 'scope2MarketPercentReductions').scope2MarketPercentReductions
                },
                scope2MarketReductionContributionRelative: {
                    max: _.maxBy(yearDetails, 'scope2MarketReductionContributionRelative').scope2MarketReductionContributionRelative,
                    min: _.minBy(yearDetails, 'scope2MarketReductionContributionRelative').scope2MarketReductionContributionRelative
                },
                scope2MarketReductionContributionTotal: {
                    max: _.maxBy(yearDetails, 'scope2MarketReductionContributionTotal').scope2MarketReductionContributionTotal,
                    min: _.minBy(yearDetails, 'scope2MarketReductionContributionTotal').scope2MarketReductionContributionTotal
                },
                scope2LocationPercentReductions: {
                    max: _.maxBy(yearDetails, 'scope2LocationPercentReductions').scope2LocationPercentReductions,
                    min: _.minBy(yearDetails, 'scope2LocationPercentReductions').scope2LocationPercentReductions
                },
                scope2LocationReductionContributionRelative: {
                    max: _.maxBy(yearDetails, 'scope2LocationReductionContributionRelative').scope2LocationReductionContributionRelative,
                    min: _.minBy(yearDetails, 'scope2LocationReductionContributionRelative').scope2LocationReductionContributionRelative
                },
                scope2LocationReductionContributionTotal: {
                    max: _.maxBy(yearDetails, 'scope2LocationReductionContributionTotal').scope2LocationReductionContributionTotal,
                    min: _.minBy(yearDetails, 'scope2LocationReductionContributionTotal').scope2LocationReductionContributionTotal
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
    scope1ReductionContributionRelative: {
        max: number,
        min: number
    },
    scope1ReductionContributionTotal: {
        max: number,
        min: number
    },
    scope2MarketPercentReductions: {
        max: number,
        min: number
    },
    scope2MarketReductionContributionRelative: {
        max: number,
        min: number
    },
    scope2MarketReductionContributionTotal: {
        max: number,
        min: number
    },
    scope2LocationPercentReductions: {
        max: number,
        min: number
    },
    scope2LocationReductionContributionRelative: {
        max: number,
        min: number
    },
    scope2LocationReductionContributionTotal: {
        max: number,
        min: number
    },
}
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
    facilityTotals: Array<{
        year: number;
        scope1Emissions: number;
        scope2LocationEmissions: number;
        scope2MarketEmissions: number;
    }>;
    constructor(account: IdbAccount, facilities: Array<IdbFacility>, meters: Array<IdbUtilityMeter>, meterData: Array<IdbUtilityMeterData>, baselineYear: number, reportYear: number,
        co2Emissions: Array<SubregionEmissions>, emissionsDisplay: 'market' | 'location', emissionsGoal: number) {
        this.baselineYear = baselineYear;
        this.reportYear = reportYear;
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, false, { energyIsSource: false, neededUnits: 'MMBtu' });
        calanderizedMeters = setEmissionsForCalanderizedMeters(calanderizedMeters, false, facilities, co2Emissions);


        this.setPortfolioYearDetails(calanderizedMeters, facilities, emissionsDisplay, emissionsGoal);
        this.setAnnualFacilitiesSummaries(calanderizedMeters, facilities, emissionsDisplay);
        this.setFacilityTotals();
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

    setFacilityTotals() {
        this.facilityTotals = new Array();
        let allBetterClimateFacilityData: Array<BetterClimateYearDetails> = this.annualFacilitiesSummaries.flatMap(annualFacility => {
            return annualFacility.betterClimateYearDetails;
        })
        for (let year = this.baselineYear; year <= this.reportYear; year++) {
            let yearBetterClimateData: Array<BetterClimateYearDetails> = allBetterClimateFacilityData.filter(data => {
                return data.year == year;
            });
            this.facilityTotals.push({
                year: year,
                scope1Emissions: _.sumBy(yearBetterClimateData, 'totalScope1Emissions'),
                scope2LocationEmissions: _.sumBy(yearBetterClimateData, 'scope2LocationEmissions'),
                scope2MarketEmissions: _.sumBy(yearBetterClimateData, 'scope2MarketEmissions')
            })
        }

    }

}


export interface BetterClimateAnnualFacilitySummary {
    facility: IdbFacility,
    betterClimateYearDetails: Array<BetterClimateYearDetails>
}
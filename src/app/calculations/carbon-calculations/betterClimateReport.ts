import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import * as _ from 'lodash';
import { setEmissionsForCalanderizedMeters } from "../emissions-calculations/emissions";
import { SubregionEmissions } from "src/app/models/eGridEmissions";
import { BetterClimateYearDetails } from "./betterClimateYearsDetails";
import { BetterClimateFacility } from "./betterClimateFacility";

export class BetterClimateReport {

    baselineYear: number;
    reportYear: number;
    portfolioYearDetails: Array<BetterClimateYearDetails>;
    annualFacilitiesSummaries: Array<{
        betterClimateFacilities: Array<BetterClimateFacility>,
        year: number
    }>;
    constructor(account: IdbAccount, facilities: Array<IdbFacility>, meters: Array<IdbUtilityMeter>, meterData: Array<IdbUtilityMeterData>, baselineYear: number, reportYear: number,
        co2Emissions: Array<SubregionEmissions>, emissionsDisplay: 'market' | 'location', emissionsGoal: number) {
        this.baselineYear = baselineYear;
        this.reportYear = reportYear;
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, false, { energyIsSource: false, neededUnits: 'MMBtu' });
        calanderizedMeters = setEmissionsForCalanderizedMeters(calanderizedMeters, false, facilities, co2Emissions);


        this.setPortfolioYearDetails(calanderizedMeters, facilities, emissionsDisplay, emissionsGoal);
        this.setAnnualFacilitiesSummaries(calanderizedMeters, facilities);
    }

    setPortfolioYearDetails(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, emissionsDisplay: 'market' | 'location', emissionsGoal: number) {
        this.portfolioYearDetails = new Array();
        let baselineYearDetails: BetterClimateYearDetails;
        let previousYearDetails: BetterClimateYearDetails;
        for (let year = this.baselineYear; year <= this.reportYear; year++) {
            let betterClimateYearDetails: BetterClimateYearDetails = new BetterClimateYearDetails(year, calanderizedMeters, facilities, emissionsDisplay, baselineYearDetails, previousYearDetails, emissionsGoal);
            this.portfolioYearDetails.push(betterClimateYearDetails);
            previousYearDetails = betterClimateYearDetails;
            if (year == this.baselineYear) {
                baselineYearDetails = betterClimateYearDetails;
            }
        }
    }

    setAnnualFacilitiesSummaries(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>) {
        this.annualFacilitiesSummaries = new Array();

        for (let year = this.baselineYear; year <= this.reportYear; year++) {
            let betterClimateFacilities: Array<BetterClimateFacility> = new Array();
            facilities.forEach(facility => {
                let betterClimateFacility: BetterClimateFacility = new BetterClimateFacility(facility, calanderizedMeters, year);
                betterClimateFacilities.push(betterClimateFacility);
            });
            this.annualFacilitiesSummaries.push({
                year: year,
                betterClimateFacilities: betterClimateFacilities
            });
        }

    }

}

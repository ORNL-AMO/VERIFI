import { CalanderizedMeter } from "src/app/models/calanderization";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import * as _ from 'lodash';
import { SubregionEmissions } from "src/app/models/eGridEmissions";
import { BetterClimateYearDetails } from "./betterClimateYearsDetails";
import { BetterClimateReportSetup } from "src/app/models/overview-report";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbCustomFuel } from "src/app/models/idbModels/customFuel";

export class BetterClimateReport {

    baselineYear: number;
    reportYear: number;
    portfolioYearDetails: Array<BetterClimateYearDetails>;
    annualFacilitiesSummaries: Array<BetterClimateAnnualFacilitySummary>;
    facilityMaxMins: Array<BetterClimateFacilityMaxMin>;
    constructor(account: IdbAccount, accountFacilities: Array<IdbFacility>, accountMeters: Array<IdbUtilityMeter>, meterData: Array<IdbUtilityMeterData>, baselineYear: number, reportYear: number,
        co2Emissions: Array<SubregionEmissions>, emissionsDisplay: 'market' | 'location', emissionsGoal: number, customFuels: Array<IdbCustomFuel>,
        betterClimateReportSetup: BetterClimateReportSetup) {
        let selectedFacilities: Array<IdbFacility> = this.getSelectedFacilities(betterClimateReportSetup, accountFacilities);
        let selectedMeters: Array<IdbUtilityMeter> = this.getSelectedMeters(betterClimateReportSetup, accountMeters);
        this.baselineYear = baselineYear;
        this.reportYear = reportYear;
        account.energyIsSource = false;
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(selectedMeters, meterData, account, false, { energyIsSource: false, neededUnits: 'MMBtu' }, co2Emissions, customFuels, selectedFacilities);
        this.setPortfolioYearDetails(calanderizedMeters, selectedFacilities, emissionsDisplay, emissionsGoal);
        this.setAnnualFacilitiesSummaries(calanderizedMeters, selectedFacilities, emissionsDisplay);
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

    setFacilityMaxMins() {
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
                scope1PercentReductions: this.getMaxMin(yearDetails, 'scope1PercentReductions'),
                scope1ReductionContributionRelative: this.getMaxMin(yearDetails, 'scope1ReductionContributionRelative'),
                scope1ReductionContributionTotal: this.getMaxMin(yearDetails, 'scope1ReductionContributionTotal'),
                scope2MarketPercentReductions: this.getMaxMin(yearDetails, 'scope2MarketPercentReductions'),
                scope2MarketReductionContributionRelative: this.getMaxMin(yearDetails, 'scope2MarketReductionContributionRelative'),
                scope2MarketReductionContributionTotal: this.getMaxMin(yearDetails, 'scope2MarketReductionContributionTotal'),
                scope2LocationPercentReductions: this.getMaxMin(yearDetails, 'scope2LocationPercentReductions'),
                scope2LocationReductionContributionRelative: this.getMaxMin(yearDetails, 'scope2LocationReductionContributionRelative'),
                scope2LocationReductionContributionTotal: this.getMaxMin(yearDetails, 'scope2LocationReductionContributionTotal'),
            })
        }
    }

    getMaxMin(yearDetails: Array<BetterClimateYearDetails>, maxMinType: MaxMinTypes): { max: number, min: number } {
        let min: number = 0;
        let max: number = 0;
        if (maxMinType == 'scope1PercentReductions') {
            let maxYearDetail: BetterClimateYearDetails = _.maxBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.percentReductions.totalScope1Emissions;
            });
            let minYearDetail: BetterClimateYearDetails = _.minBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.percentReductions.totalScope1Emissions;
            });
            if (maxYearDetail) {
                max = maxYearDetail.percentReductions.totalScope1Emissions;
            }
            if (minYearDetail) {
                min = minYearDetail.percentReductions.totalScope1Emissions
            }
        } else if (maxMinType == 'scope1ReductionContributionRelative') {
            let maxYearDetail: BetterClimateYearDetails = _.maxBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.relativeContribution.totalScope1Emissions;
            });
            let minYearDetail: BetterClimateYearDetails = _.minBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.relativeContribution.totalScope1Emissions;
            });
            if (maxYearDetail) {
                max = maxYearDetail.relativeContribution.totalScope1Emissions;
            }
            if (minYearDetail) {
                min = minYearDetail.relativeContribution.totalScope1Emissions
            }
        } else if (maxMinType == 'scope1ReductionContributionTotal') {
            let maxYearDetail: BetterClimateYearDetails = _.maxBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.totalContribution.totalScope1Emissions;
            });
            let minYearDetail: BetterClimateYearDetails = _.minBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.totalContribution.totalScope1Emissions;
            });
            if (maxYearDetail) {
                max = maxYearDetail.totalContribution.totalScope1Emissions;
            }
            if (minYearDetail) {
                min = minYearDetail.totalContribution.totalScope1Emissions
            }
        } else if (maxMinType == 'scope2MarketPercentReductions') {
            let maxYearDetail: BetterClimateYearDetails = _.maxBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.percentReductions.scope2MarketEmissions;
            });
            let minYearDetail: BetterClimateYearDetails = _.minBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.percentReductions.scope2MarketEmissions;
            });
            if (maxYearDetail) {
                max = maxYearDetail.percentReductions.scope2MarketEmissions;
            }
            if (minYearDetail) {
                min = minYearDetail.percentReductions.scope2MarketEmissions;
            }
        } else if (maxMinType == 'scope2MarketReductionContributionRelative') {
            let maxYearDetail: BetterClimateYearDetails = _.maxBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.relativeContribution.scope2MarketEmissions;
            });
            let minYearDetail: BetterClimateYearDetails = _.minBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.relativeContribution.scope2MarketEmissions;
            });
            if (maxYearDetail) {
                max = maxYearDetail.relativeContribution.scope2MarketEmissions;
            }
            if (minYearDetail) {
                min = minYearDetail.relativeContribution.scope2MarketEmissions;
            }
        } else if (maxMinType == 'scope2MarketReductionContributionTotal') {
            let maxYearDetail: BetterClimateYearDetails = _.maxBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.totalContribution.scope2MarketEmissions;
            });
            let minYearDetail: BetterClimateYearDetails = _.minBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.totalContribution.scope2MarketEmissions;
            });
            if (maxYearDetail) {
                max = maxYearDetail.totalContribution.scope2MarketEmissions;
            }
            if (minYearDetail) {
                min = minYearDetail.totalContribution.scope2MarketEmissions;
            }
        } else if (maxMinType == 'scope2LocationPercentReductions') {
            let maxYearDetail: BetterClimateYearDetails = _.maxBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.percentReductions.scope2LocationEmissions;
            });
            let minYearDetail: BetterClimateYearDetails = _.minBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.percentReductions.scope2LocationEmissions;
            });
            if (maxYearDetail) {
                max = maxYearDetail.percentReductions.scope2LocationEmissions;
            }
            if (minYearDetail) {
                min = minYearDetail.percentReductions.scope2LocationEmissions;
            }
        } else if (maxMinType == 'scope2LocationReductionContributionRelative') {
            let maxYearDetail: BetterClimateYearDetails = _.maxBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.relativeContribution.scope2LocationEmissions;
            });
            let minYearDetail: BetterClimateYearDetails = _.minBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.relativeContribution.scope2LocationEmissions;
            });
            if (maxYearDetail) {
                max = maxYearDetail.relativeContribution.scope2LocationEmissions;
            }
            if (minYearDetail) {
                min = minYearDetail.relativeContribution.scope2LocationEmissions;
            }
        } else if (maxMinType == 'scope2LocationReductionContributionTotal') {
            let maxYearDetail: BetterClimateYearDetails = _.maxBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.totalContribution.scope2LocationEmissions;
            });
            let minYearDetail: BetterClimateYearDetails = _.minBy(yearDetails, (detail: BetterClimateYearDetails) => {
                return detail.totalContribution.scope2LocationEmissions;
            });
            if (maxYearDetail) {
                max = maxYearDetail.totalContribution.scope2LocationEmissions;
            }
            if (minYearDetail) {
                min = minYearDetail.totalContribution.scope2LocationEmissions;
            }
        }

        return {
            min: min,
            max: max
        }
    }

    getSelectedFacilities(betterClimateReportSetup: BetterClimateReportSetup, facilities: Array<IdbFacility>): Array<IdbFacility> {
        if (betterClimateReportSetup.selectMeterData) {
            let selectedFacilities: Array<IdbFacility> = new Array();
            betterClimateReportSetup.includedFacilityGroups.forEach(facilityOption => {
                if (facilityOption.include) {
                    let facility: IdbFacility = facilities.find(facility => { return facility.guid == facilityOption.facilityId });
                    selectedFacilities.push(facility);
                }
            });
            return selectedFacilities;
        } else {
            return facilities;
        }
    }

    getSelectedMeters(betterClimateReportSetup: BetterClimateReportSetup, meters: Array<IdbUtilityMeter>): Array<IdbUtilityMeter> {
        if (betterClimateReportSetup.selectMeterData) {
            let selectedMeters: Array<IdbUtilityMeter> = new Array();
            betterClimateReportSetup.includedFacilityGroups.forEach(facilityOption => {
                if (facilityOption.include) {
                    facilityOption.groups.forEach(groupOption => {
                        if (groupOption.include) {
                            let groupMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
                                return meter.groupId == groupOption.groupId;
                            });
                            groupMeters.forEach(meter => {
                                selectedMeters.push(meter);
                            })
                        }
                    });
                }
            });
            return selectedMeters;
        } else {
            return meters;
        }
    }

}


export interface BetterClimateAnnualFacilitySummary {
    facility: IdbFacility,
    betterClimateYearDetails: Array<BetterClimateYearDetails>
}

export interface BetterClimateFacilityMaxMin {
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

export type MaxMinTypes = 'scope1PercentReductions' | 'scope1ReductionContributionRelative' | 'scope1ReductionContributionTotal' | 'scope2MarketPercentReductions' | 'scope2MarketReductionContributionRelative' | 'scope2MarketReductionContributionTotal' | 'scope2LocationPercentReductions' | 'scope2LocationReductionContributionRelative' | 'scope2LocationReductionContributionTotal';
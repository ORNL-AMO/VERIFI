import { AnalysisGroup, JStatRegressionModel, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { AnnualAnalysisSummaryDataClass } from "./annualAnalysisSummaryDataClass";
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { MonthlyAccountAnalysisClass } from "./monthlyAccountAnalysisClass";
import { checkAnalysisValue, getLatestYearWithData, getYearsWithFullData } from "../shared-calculations/calculationsHelpers";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import { getNeededUnits } from "../shared-calculations/calanderizationFunctions";
import * as _ from 'lodash';

export class AnnualAccountAnalysisSummaryClass {

    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    annualAnalysisSummaryDataClasses: Array<AnnualAnalysisSummaryDataClass>;
    facilitySummaries: Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }>
    baselineYear: number;
    reportYear: number;
    constructor(
        accountAnalysisItem: IdbAccountAnalysisItem,
        account: IdbAccount,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorData>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        calculateAllMonthlyData: boolean,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        accountPredictors: Array<IdbPredictor>) {
        this.setReportYear(accountAnalysisItem, meters, meterData, account, accountFacilities, allAccountAnalysisItems, accountPredictorEntries);
        this.setMonthlyAnalysisSummaryData(accountAnalysisItem, account, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData, meters, meterData, accountPredictors);
        this.setBaselineYear(accountAnalysisItem);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries, accountPredictors);
    }

    setMonthlyAnalysisSummaryData(analysisItem: IdbAccountAnalysisItem, account: IdbAccount, accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorData>, allAccountAnalysisItems: Array<IdbAnalysisItem>, calculateAllMonthlyData: boolean,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>, accountPredictors: Array<IdbPredictor>) {
        let monthlyAnalysisSummaryClass: MonthlyAccountAnalysisClass = new MonthlyAccountAnalysisClass(analysisItem, account, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData, meters, meterData, accountPredictors);
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
        this.facilitySummaries = monthlyAnalysisSummaryClass.facilitySummaries;
    }

    setBaselineYear(analysisItem: IdbAccountAnalysisItem) {
        this.baselineYear = analysisItem.baselineYear;
    }

    setReportYear(analysisItem: IdbAccountAnalysisItem,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        account: IdbAccount,
        accountFacilities: Array<IdbFacility>,
        facilityAnalysisItems: Array<IdbAnalysisItem>,
        predictorData: Array<IdbPredictorData>) {
        if (analysisItem.calculatedReportYear) {
            this.reportYear = analysisItem.calculatedReportYear;
        } else {
            let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, false, { energyIsSource: analysisItem.energyIsSource, neededUnits: getNeededUnits(analysisItem) }, [], [], accountFacilities, account.assessmentReportVersion, []);
            let includedFacilityAnalysis: Array<IdbAnalysisItem> = new Array();
            analysisItem.facilityAnalysisItems.forEach(facilityItem => {
                if (facilityItem.analysisItemId) {
                    const facilityAnalysis: IdbAnalysisItem = facilityAnalysisItems.find(item => item.guid === facilityItem.analysisItemId);
                    // let facility: IdbFacility = accountFacilities.find(fac => fac.guid == facilityItem.facilityId);
                    includedFacilityAnalysis.push(facilityAnalysis);
                }
            });
            //TODO need to update this to only look at meters that are included in the analysis item 
            // need full year
            // this.reportYear = getLatestYearWithData(calanderizedMeters, includedFacilityAnalysis);

            const { includedMeterIds, includedPredictorIds } = this.collectRegressionGroupInputIds(meters, includedFacilityAnalysis);
            let latestYears: Array<Date> = [];
            for (const meterId of includedMeterIds) {
                const cMeter: CalanderizedMeter = calanderizedMeters.find(cMeter => cMeter.meter.guid === meterId);
                const facility: IdbFacility = accountFacilities.find(fac => {
                    return fac.guid == cMeter.meter.facilityId
                });
                const fullYearsWithData: Array<number> = getYearsWithFullData([cMeter], facility)
                const latestYearWithData = _.max(fullYearsWithData);
                if (latestYearWithData) {
                    latestYears.push(latestYearWithData);
                }
            }
            for (const predictorId of includedPredictorIds) {
                const predictorDataForPredictor = predictorData.filter(predictorEntry => predictorEntry.predictorId === predictorId);
                //years with 12 months of data
                const years: Array<number> = predictorDataForPredictor.map(entry => { return entry.year });
                //get counts of years to find full years of data
                const yearCounts = _.countBy(years);
                const fullYears = Object.keys(yearCounts).filter(year => yearCounts[year] >= 12).map(year => parseInt(year));
                const latestYearWithData = _.max(fullYears);
                if (latestYearWithData) {
                    latestYears.push(latestYearWithData);
                }
            }
            //minimum date of all meters and predictors included in the analysis groups will determine the 
            //report year to ensure full year of data for all inputs
            const minYear: number = _.min(latestYears);
            this.reportYear = minYear;
            analysisItem.calculatedReportYear = this.reportYear;


            // let includedFacility: Array<IdbFacility> = new Array();
            // analysisItem.facilityAnalysisItems.forEach(facilityItem => {
            //     if (facilityItem.analysisItemId) {
            //         let facility: IdbFacility = accountFacilities.find(fac => fac.guid == facilityItem.facilityId);
            //         includedFacility.push(facility);
            //     }
            // });
            // //TODO need to update this to only look at meters that are included in the analysis item 
            // // need full year
            // this.reportYear = getLatestYearWithData(calanderizedMeters, includedFacility);
            // analysisItem.calculatedReportYear = this.reportYear;
        }
    }

    collectRegressionGroupInputIds(
        meters: Array<IdbUtilityMeter>,
        facilityAnalysisItems: Array<IdbAnalysisItem>
    ): { includedMeterIds: Array<string>; includedPredictorIds: Array<string> } {
        const includedMeterIds: Array<string> = [];
        const includedPredictorIds: Array<string> = [];
        for (const analysisItem of facilityAnalysisItems) {
            for (const group of analysisItem.groups) {
                if (group.analysisType == 'skip' || group.analysisType == 'skipAnalysis') {
                    continue;
                }
                if (group.analysisType == 'energyIntensity' || group.analysisType == 'modifiedEnergyIntensity') {
                    group.predictorVariables.forEach(pv => {
                        if (pv.productionInAnalysis && !includedPredictorIds.includes(pv.id) && pv.id) {
                            includedPredictorIds.push(pv.id);
                        }
                    });
                }

                // Collect predictor IDs from the group's selected regression model.
                if (group.analysisType == 'regression') {
                    if (group.isGeneratedModel) {
                        const selectedModel: JStatRegressionModel = group.models?.find(m => m.modelId === group.selectedModelId);
                        if (selectedModel) {
                            for (const pv of selectedModel.predictorVariables) {
                                if (!includedPredictorIds.includes(pv.id) && pv.id) {
                                    includedPredictorIds.push(pv.id);
                                }
                            }
                        }
                    } else {
                        //user defined model
                        group.predictorVariables.forEach(pv => {
                            if (pv.productionInAnalysis && !includedPredictorIds.includes(pv.id) && pv.id) {
                                includedPredictorIds.push(pv.id);
                            }
                        });
                    }
                }

                // Collect unique meter IDs for all calanderized meters belonging to this group.
                const groupMeters: Array<IdbUtilityMeter> = meters.filter(meter => meter.groupId === group.idbGroupId);
                for (const meter of groupMeters) {
                    if (!includedMeterIds.includes(meter.guid)) {
                        includedMeterIds.push(meter.guid);
                    }
                }
            }
        }

        return { includedMeterIds, includedPredictorIds };
    }



    setAnnualAnalysisSummaryDataClasses(accountPredictorEntries: Array<IdbPredictorData>, accountPredictors: Array<IdbPredictor>) {
        this.annualAnalysisSummaryDataClasses = new Array();
        let analysisYear: number = this.baselineYear;
        while (analysisYear <= this.reportYear) {
            let yearAnalysisSummaryDataClass: AnnualAnalysisSummaryDataClass = new AnnualAnalysisSummaryDataClass(this.monthlyAnalysisSummaryData, analysisYear, accountPredictorEntries, undefined, this.annualAnalysisSummaryDataClasses, accountPredictors);
            this.annualAnalysisSummaryDataClasses.push(yearAnalysisSummaryDataClass);
            analysisYear++;
        }
    }

    getAnnualAnalysisSummaries(): Array<AnnualAnalysisSummary> {
        return this.annualAnalysisSummaryDataClasses.map(summaryDataClass => {
            return {
                year: summaryDataClass.year,
                energyUse: summaryDataClass.energyUse,
                adjusted: summaryDataClass.adjusted,
                baselineAdjustmentForNormalization: checkAnalysisValue(summaryDataClass.baselineAdjustmentForNormalization),
                baselineAdjustmentForOtherV2: checkAnalysisValue(summaryDataClass.baselineAdjustmentForOtherV2),
                baselineAdjustment: checkAnalysisValue(summaryDataClass.baselineAdjustment),
                SEnPI: checkAnalysisValue(summaryDataClass.SEnPI),
                savings: checkAnalysisValue(summaryDataClass.savings),
                totalSavingsPercentImprovement: checkAnalysisValue(summaryDataClass.totalSavingsPercentImprovement) * 100,
                annualSavingsPercentImprovement: checkAnalysisValue(summaryDataClass.annualSavingsPercentImprovement) * 100,
                cummulativeSavings: checkAnalysisValue(summaryDataClass.cummulativeSavings),
                newSavings: checkAnalysisValue(summaryDataClass.newSavings),
                predictorUsage: summaryDataClass.predictorUsage,
                isBanked: false,
                isIntermediateBanked: false,
                savingsBanked: checkAnalysisValue(summaryDataClass.savingsBanked),
                savingsUnbanked: checkAnalysisValue(summaryDataClass.savingsUnbanked),
                missingPredictorValue: summaryDataClass.missingPredictorValue,
                missingPredictors: summaryDataClass.missingPredictors
            }
        })
    }
}
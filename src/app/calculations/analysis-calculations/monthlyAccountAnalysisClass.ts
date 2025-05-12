import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { MonthlyAccountAnalysisDataClass } from "./monthlyAccountAnalysisDataClass";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { MonthlyFacilityAnalysisClass } from "./monthlyFacilityAnalysisClass";
import * as _ from 'lodash';
import { checkAnalysisValue, getMonthlyStartAndEndDate } from "../shared-calculations/calculationsHelpers";
import { getFiscalYear, getNeededUnits } from "../shared-calculations/calanderizationFunctions";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";

export class MonthlyAccountAnalysisClass {

    allAccountAnalysisData: Array<MonthlyAnalysisSummaryDataClass>;
    accountMonthSummaries: Array<MonthlyAccountAnalysisDataClass>;
    monthlyFacilityAnalysisClasses: Array<MonthlyFacilityAnalysisClass>;
    facilitySummaries: Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }>
    startDate: Date;
    endDate: Date;
    facilityPredictorEntries: Array<IdbPredictorData>;
    baselineYear: number;
    annualUsageValues: Array<{ year: number, usage: number }>
    constructor(
        accountAnalysisItem: IdbAccountAnalysisItem,
        account: IdbAccount,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorData>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        calculateAllMonthlyData: boolean,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        accountPredictors: Array<IdbPredictor>
    ) {
        this.setMonthlyFacilityAnlysisClasses(accountAnalysisItem, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData, meters, meterData, accountPredictors, account.assessmentReportVersion);
        this.setStartAndEndDate(account, accountAnalysisItem, calculateAllMonthlyData);
        this.setBaselineYear(account);
        this.setAnnualUsageValues();
        this.setAccountMonthSummaries(account);
    }

    setStartAndEndDate(account: IdbAccount, analysisItem: IdbAccountAnalysisItem, calculateAllMonthlyData: boolean) {
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = getMonthlyStartAndEndDate(account, analysisItem, undefined);
        this.startDate = monthlyStartAndEndDate.baselineDate;
        if (calculateAllMonthlyData) {
            let endDates: Array<Date> = this.monthlyFacilityAnalysisClasses.map(monthFacilityAnalysisClass => { return monthFacilityAnalysisClass.endDate });
            let minEndDate: Date = _.min(endDates);
            this.endDate = new Date(minEndDate);
        } else {
            this.endDate = monthlyStartAndEndDate.endDate;
        }
    }

    setBaselineYear(account: IdbAccount) {
        this.baselineYear = getFiscalYear(this.startDate, account);
    }

    setMonthlyFacilityAnlysisClasses(
        accountAnalysisItem: IdbAccountAnalysisItem,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorData>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        calculateAllMonthlyData: boolean,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        accountPredictors: Array<IdbPredictor>,
        assessmentReportVersion: 'AR4' | 'AR5') {
        this.monthlyFacilityAnalysisClasses = new Array();
        this.facilitySummaries = new Array();
        accountAnalysisItem.facilityAnalysisItems.forEach(item => {
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let analysisItem: IdbAnalysisItem = allAccountAnalysisItems.find(accountItem => { return item.analysisItemId == accountItem.guid });
                let facility: IdbFacility = accountFacilities.find(facility => { return facility.guid == item.facilityId });
                let facilityMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.facilityId == facility.guid });
                let calanderizedMeterData: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, meterData, facility, false, { energyIsSource: analysisItem.energyIsSource, neededUnits: getNeededUnits(analysisItem) }, [], [], accountFacilities, assessmentReportVersion);
                let monthlyFacilityAnalysisClass: MonthlyFacilityAnalysisClass = new MonthlyFacilityAnalysisClass(
                    analysisItem,
                    facility,
                    calanderizedMeterData,
                    accountPredictorEntries,
                    calculateAllMonthlyData,
                    accountPredictors,
                    allAccountAnalysisItems
                );
                if (analysisItem.analysisCategory == 'energy' && (analysisItem.energyUnit != accountAnalysisItem.energyUnit)) {
                    monthlyFacilityAnalysisClass.convertResults(analysisItem.energyUnit, accountAnalysisItem.energyUnit);
                } else if (analysisItem.analysisCategory == 'water' && (analysisItem.waterUnit != accountAnalysisItem.waterUnit)) {
                    monthlyFacilityAnalysisClass.convertResults(analysisItem.waterUnit, accountAnalysisItem.waterUnit);
                }
                this.monthlyFacilityAnalysisClasses.push(monthlyFacilityAnalysisClass);
                this.facilitySummaries.push({
                    facility: facility,
                    analysisItem: analysisItem,
                    monthlySummaryData: monthlyFacilityAnalysisClass.getMonthlyAnalysisSummaryData()
                })
            }
        });
        this.allAccountAnalysisData = this.monthlyFacilityAnalysisClasses.flatMap(analysisClass => { return analysisClass.allFacilityAnalysisData });
    }

    setAnnualUsageValues() {
        this.annualUsageValues = new Array();
        for (let year = this.baselineYear + 1; year <= this.endDate.getUTCFullYear(); year++) {
            let yearMeterData: Array<MonthlyAnalysisSummaryDataClass> = this.allAccountAnalysisData.filter(data => { return data.fiscalYear == year });
            let totalUsage: number = _.sumBy(yearMeterData, 'energyUse');
            this.annualUsageValues.push({ year: year, usage: totalUsage });
        }
    }

    setAccountMonthSummaries(account: IdbAccount) {
        this.accountMonthSummaries = new Array();
        let monthDate: Date = new Date(this.startDate);
        while (monthDate < this.endDate) {
            let monthSummary: MonthlyAccountAnalysisDataClass = new MonthlyAccountAnalysisDataClass(
                this.allAccountAnalysisData,
                monthDate,
                account,
                this.accountMonthSummaries,
                this.baselineYear
            );
            this.accountMonthSummaries.push(monthSummary);
            let currentMonth: number = monthDate.getUTCMonth()
            let nextMonth: number = currentMonth + 1;
            monthDate = new Date(monthDate.getUTCFullYear(), nextMonth, 1);
        }
    }

    getMonthlyAnalysisSummaryData(): Array<MonthlyAnalysisSummaryData> {
        return this.accountMonthSummaries.map(summaryDataItem => {
            return {
                date: summaryDataItem.date,
                energyUse: summaryDataItem.monthlyAnalysisCalculatedValues.energyUse,
                modeledEnergy: undefined,
                adjusted: summaryDataItem.monthlyAnalysisCalculatedValues.adjusted,
                baselineAdjustmentForNormalization: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustmentForNormalization),
                baselineAdjustmentForOtherV2: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustmentForOtherV2),
                baselineAdjustment: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustment),
                fiscalYear: summaryDataItem.fiscalYear,
                group: undefined,
                SEnPI: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.SEnPI),
                savings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.savings),
                percentSavingsComparedToBaseline: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.percentSavingsComparedToBaseline) * 100,
                yearToDateSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDateSavings),
                yearToDatePercentSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDatePercentSavings) * 100,
                rollingSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rollingSavings),
                rolling12MonthImprovement: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovement) * 100,
                dataAdjustment: summaryDataItem.dataAdjustment,
                modelYearDataAdjustment: summaryDataItem.modelYearDataAdjustment,
                // adjustedStar: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedStar,
                // adjustedStarStar: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedStarStar,
                baselineAdjustmentInput: summaryDataItem.baselineAdjustmentInput,
                isBanked: false,
                isIntermediateBanked: false,
                savingsBanked: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.savingsBanked),
                savingsUnbanked: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.savingsUnbanked)
            }
        })
    }
}
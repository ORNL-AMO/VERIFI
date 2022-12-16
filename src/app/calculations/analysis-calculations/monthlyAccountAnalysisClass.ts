import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { MonthlyAccountAnalysisDataClass } from "./monthlyAccountAnalysisDataClass";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { MonthlyFacilityAnalysisClass } from "./monthlyFacilityAnalysisClass";
import * as _ from 'lodash';
import { checkAnalysisValue, getMonthlyStartAndEndDate } from "../shared-calculations/calculationsHelpers";
import { getFiscalYear, getLastBillEntryFromCalanderizedMeterData } from "../shared-calculations/calanderizationFunctions";

export class MonthlyAccountAnalysisClass {

    allAccountAnalysisData: Array<MonthlyAnalysisSummaryDataClass>;
    accountMonthSummaries: Array<MonthlyAccountAnalysisDataClass>;
    monthlyFacilityAnalysisClasses: Array<MonthlyFacilityAnalysisClass>
    startDate: Date;
    endDate: Date;
    facilityPredictorEntries: Array<IdbPredictorEntry>;
    baselineYear: number;
    annualUsageValues: Array<{year: number, usage: number}>
    constructor(
        accountAnalysisItem: IdbAccountAnalysisItem,
        account: IdbAccount,
        calanderizedMeters: Array<CalanderizedMeter>,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        calculateAllMonthlyData: boolean
    ) {
        this.setStartAndEndDate(account, accountAnalysisItem, calanderizedMeters, calculateAllMonthlyData);
        this.setBaselineYear(account);
        this.setMonthlyFacilityAnlysisClasses(accountAnalysisItem, calanderizedMeters, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData);
        this.setAnnualUsageValues();
        this.setAccountMonthSummaries(account, accountAnalysisItem);
    }

    setStartAndEndDate(account: IdbAccount, analysisItem: IdbAccountAnalysisItem, calanderizedMeters: Array<CalanderizedMeter>, calculateAllMonthlyData: boolean) {
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = getMonthlyStartAndEndDate(account, analysisItem);
        this.startDate = monthlyStartAndEndDate.baselineDate;
        if (calculateAllMonthlyData) {
            let lastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
            this.endDate = new Date(lastBill.date);
            this.endDate.setMonth(this.endDate.getMonth() + 1);
            this.endDate.setDate(1);
        } else {
            this.endDate = monthlyStartAndEndDate.endDate;
        }
    }

    setBaselineYear(account: IdbAccount) {
        this.baselineYear = getFiscalYear(this.startDate, account);
    }

    setMonthlyFacilityAnlysisClasses(
        accountAnalysisItem: IdbAccountAnalysisItem,
        calanderizedMeters: Array<CalanderizedMeter>,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        calculateAllMonthlyData: boolean) {
        this.monthlyFacilityAnalysisClasses = new Array();
        accountAnalysisItem.facilityAnalysisItems.forEach(item => {
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let analysisItem: IdbAnalysisItem = allAccountAnalysisItems.find(accountItem => { return item.analysisItemId == accountItem.guid });
                analysisItem.energyUnit = accountAnalysisItem.energyUnit;
                let facility: IdbFacility = accountFacilities.find(facility => { return facility.guid == item.facilityId });
                let monthlyFacilityAnalysisClass: MonthlyFacilityAnalysisClass = new MonthlyFacilityAnalysisClass(
                    analysisItem,
                    facility,
                    calanderizedMeters,
                    accountPredictorEntries,
                    calculateAllMonthlyData
                );
                this.monthlyFacilityAnalysisClasses.push(monthlyFacilityAnalysisClass);
            }
        });
        this.allAccountAnalysisData = this.monthlyFacilityAnalysisClasses.flatMap(analysisClass => { return analysisClass.allFacilityAnalysisData });
    }

    setAnnualUsageValues(){
        this.annualUsageValues = new Array();
        for (let year = this.baselineYear + 1; year <= this.endDate.getUTCFullYear(); year++) {
          let yearMeterData: Array<MonthlyAnalysisSummaryDataClass> = this.allAccountAnalysisData.filter(data => { return data.fiscalYear == year });
          let totalUsage: number = _.sumBy(yearMeterData, 'energyUse');
          this.annualUsageValues.push({ year: year, usage: totalUsage });
        }
    }

    setAccountMonthSummaries(account: IdbAccount, accountAnalysisItem: IdbAccountAnalysisItem) {
        this.accountMonthSummaries = new Array();
        let monthDate: Date = new Date(this.startDate);
        while (monthDate < this.endDate) {
            let monthSummary: MonthlyAccountAnalysisDataClass = new MonthlyAccountAnalysisDataClass(
                this.allAccountAnalysisData,
                monthDate,
                // this.facilityPredictorEntries,
                this.accountMonthSummaries,
                this.baselineYear,
                account,
                accountAnalysisItem,
                this.annualUsageValues
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
                energyUse: summaryDataItem.energyUse,
                modeledEnergy: summaryDataItem.modeledEnergy,
                adjustedForNormalization: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedForNormalization,
                adjusted: summaryDataItem.monthlyAnalysisCalculatedValues.adjusted,
                baselineAdjustmentForNormalization: summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustmentForNormalization,
                baselineAdjustmentForOther: summaryDataItem.baselineAdjustmentForOther,
                baselineAdjustment: summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustment,
                // predictorUsage: summaryDataItem.predictorUsage,
                fiscalYear: summaryDataItem.fiscalYear,
                group: undefined,
                SEnPI: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.SEnPI),
                savings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.savings),
                percentSavingsComparedToBaseline: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.percentSavingsComparedToBaseline) * 100,
                yearToDateSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDateSavings),
                yearToDatePercentSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDatePercentSavings) * 100,
                rollingSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rollingSavings),
                rolling12MonthImprovement: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovement) * 100,
            }
        })
    }
}
import { IdbAccount, IdbAccountAnalysisItem } from "src/app/models/idb";
import { MonthlyAnalysisCalculatedValues } from "./monthlyAnalysisCalculatedValuesClass";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import * as _ from 'lodash';
import { getFiscalYear } from "../shared-calculations/calanderizationFunctions";
export class MonthlyAccountAnalysisDataClass {


    date: Date;
    energyUse: number;
    modeledEnergy: number;
    baselineAdjustmentForOther: number;
    fiscalYear: number;
    monthlyAnalysisCalculatedValues: MonthlyAnalysisCalculatedValues;

    currentMonthData: Array<MonthlyAnalysisSummaryDataClass>;
    baselineActualEnergyUse: number;
    monthIndex: number;
    constructor(
        allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>,
        monthDate: Date,
        previousMonthsSummaryData: Array<MonthlyAccountAnalysisDataClass>,
        baselineYear: number,
        account: IdbAccount,
        analysisItem: IdbAccountAnalysisItem,
        annualUsageValues: Array<{year: number, usage: number}>) {
        this.date = monthDate;
        this.setFiscalYear(account);
        this.setCurrentMonthData(allFacilityAnalysisData);
        this.setEnergyUse();
        this.setModeledEnergy();
        this.setBaselineAdjustmentForOther(analysisItem, baselineYear, annualUsageValues);
        this.setMonthIndex(previousMonthsSummaryData);
        this.setBaselineActualEnergyUse(baselineYear, previousMonthsSummaryData);
        this.setMonthlyAnalysisCalculatedValues(baselineYear, previousMonthsSummaryData);
    }

    setCurrentMonthData(allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>) {
        this.currentMonthData = allFacilityAnalysisData.filter(summaryData => {
            let summaryDataDate: Date = new Date(summaryData.date);
            return summaryDataDate.getUTCMonth() == this.date.getUTCMonth() && summaryDataDate.getUTCFullYear() == this.date.getUTCFullYear();
        });
    }

    setFiscalYear(facility: IdbAccount) {
        this.fiscalYear = getFiscalYear(new Date(this.date), facility);
    }

    setEnergyUse() {
        this.energyUse = _.sumBy(this.currentMonthData, 'energyUse');
    }

    setModeledEnergy() {
        this.modeledEnergy = _.sumBy(this.currentMonthData, 'modeledEnergy');
    }

    setBaselineAdjustmentForOther(accountAnalysisItem: IdbAccountAnalysisItem, baselineYear: number, annualUsageValues: Array<{year: number, usage: number}>) {
        this.baselineAdjustmentForOther = _.sumBy(this.currentMonthData, 'baselineAdjustmentForOther');
        if (accountAnalysisItem.hasBaselineAdjustement && this.fiscalYear != baselineYear) {
            let annualEnergyUse: number = annualUsageValues.find(usageVal => {return usageVal.year == this.fiscalYear})?.usage;
            let yearAdjustment: { year: number, amount: number } = accountAnalysisItem.baselineAdjustments.find(bAdjustement => { return bAdjustement.year == this.date.getUTCFullYear(); })
            if (yearAdjustment.amount) {
                let accountBaselineAdjustementForOther: number = (this.energyUse / annualEnergyUse) * yearAdjustment.amount;
                this.baselineAdjustmentForOther = this.baselineAdjustmentForOther + accountBaselineAdjustementForOther;
            }
        }
    }

    setMonthIndex(previousMonthsSummaryData: Array<MonthlyAccountAnalysisDataClass>) {
        let summaryDataIndex: number = previousMonthsSummaryData.length;
        if (summaryDataIndex == 0) {
            this.monthIndex = 0;
        } else {
            let previousMonthSummaryData: MonthlyAccountAnalysisDataClass = previousMonthsSummaryData[summaryDataIndex - 1];
            if (previousMonthSummaryData.fiscalYear == this.fiscalYear) {
                this.monthIndex = previousMonthSummaryData.monthIndex + 1;
            } else {
                this.monthIndex = 0;
            }
        }
    }

    setBaselineActualEnergyUse(baselineYear: number, previousMonthsSummaryData: Array<MonthlyAccountAnalysisDataClass>) {
        if (this.fiscalYear == baselineYear) {
            this.baselineActualEnergyUse = this.energyUse;
        } else {
            this.baselineActualEnergyUse = previousMonthsSummaryData[this.monthIndex].energyUse;
        }
    }
    setMonthlyAnalysisCalculatedValues(baselineYear: number, previousMonthsSummaryData: Array<MonthlyAccountAnalysisDataClass>) {
        let previousMonthsAnalysisCalculatedValues: Array<MonthlyAnalysisCalculatedValues> = previousMonthsSummaryData.map(data => { return data.monthlyAnalysisCalculatedValues });
        this.monthlyAnalysisCalculatedValues = new MonthlyAnalysisCalculatedValues(
            this.energyUse,
            this.modeledEnergy,
            this.baselineAdjustmentForOther,
            this.fiscalYear,
            baselineYear,
            previousMonthsAnalysisCalculatedValues,
            this.baselineActualEnergyUse
        );
    }

}
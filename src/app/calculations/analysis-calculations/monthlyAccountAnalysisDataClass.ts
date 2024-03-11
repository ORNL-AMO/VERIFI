import { IdbAccount, IdbAccountAnalysisItem } from "src/app/models/idb";
import { MonthlyAnalysisCalculatedValues } from "./monthlyAnalysisCalculatedValuesClass";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import * as _ from 'lodash';
import { getFiscalYear } from "../shared-calculations/calanderizationFunctions";

export class MonthlyAccountAnalysisDataClass {
    date: Date;
    energyUse: number;
    modeledEnergy: number;
    baselineAdjustmentInput: number;
    fiscalYear: number;
    monthlyAnalysisCalculatedValues: MonthlyAnalysisCalculatedValues;

    currentMonthData: Array<MonthlyAnalysisSummaryDataClass>;
    baselineActualEnergyUse: number;
    monthIndex: number;

    //adjustment corresponding to the model year
    modelYearDataAdjustment: number;
    //adjustment corresponding to the current year
    dataAdjustment: number;
    constructor(
        allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>,
        monthDate: Date,
        previousMonthsSummaryData: Array<MonthlyAccountAnalysisDataClass>,
        baselineYear: number,
        account: IdbAccount,
        analysisItem: IdbAccountAnalysisItem,
        annualUsageValues: Array<{ year: number, usage: number }>) {
        this.date = monthDate;
        this.setFiscalYear(account);
        this.setCurrentMonthData(allFacilityAnalysisData);
        this.setEnergyUse();
        this.setModeledEnergy();
        this.setModelYearDataAdjustment();
        this.setDataAdjustment();
        this.setBaselineAdjustmentInput();
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
        this.energyUse = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.energyUse });
    }

    setModeledEnergy() {
        this.modeledEnergy = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.modeledEnergy });
    }

    setModelYearDataAdjustment() {
        this.modelYearDataAdjustment = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.modelYearDataAdjustment });
    }

    setDataAdjustment() {
        this.dataAdjustment = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.dataAdjustment });
    }

    setBaselineAdjustmentInput() {
        this.baselineAdjustmentInput = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.baselineAdjustmentInput });
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
            this.baselineAdjustmentInput,
            this.fiscalYear,
            baselineYear,
            previousMonthsAnalysisCalculatedValues,
            this.baselineActualEnergyUse,
            this.modelYearDataAdjustment,
            this.dataAdjustment
        );
    }

}
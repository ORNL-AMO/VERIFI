import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import * as _ from 'lodash';
import { getFiscalYear } from "../shared-calculations/calanderizationFunctions";
import { MonthlyAnalysisCalculatedValuesSummation } from "./monthlyAnalysisCalculatedValuesClassSummation";
import { IdbAccount } from "src/app/models/idbModels/account";

export class MonthlyAccountAnalysisDataClass {
    date: Date;
    baselineAdjustmentInput: number;
    fiscalYear: number;
    monthlyAnalysisCalculatedValues: MonthlyAnalysisCalculatedValuesSummation;

    currentMonthData: Array<MonthlyAnalysisSummaryDataClass>;
    //adjustment corresponding to the model year
    modelYearDataAdjustment: number;
    //adjustment corresponding to the current year
    dataAdjustment: number;

    baselineAdjustmentForNew: number;
    constructor(
        allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>,
        monthDate: Date,
        account: IdbAccount,
        previousMonthsSummaryData: Array<MonthlyAccountAnalysisDataClass>,
        baselineYear: number) {
        this.date = monthDate;
        this.setFiscalYear(account);
        this.setCurrentMonthData(allFacilityAnalysisData);
        this.setModelYearDataAdjustment();
        this.setDataAdjustment();
        this.setBaselineAdjustmentInput();
        this.setBaselineAdjustmentForNew(allFacilityAnalysisData);
        this.setMonthlyAnalysisCalculatedValues(previousMonthsSummaryData, baselineYear);
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

    setModelYearDataAdjustment() {
        this.modelYearDataAdjustment = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.modelYearDataAdjustment });
    }

    setDataAdjustment() {
        this.dataAdjustment = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.dataAdjustment });
    }

    setBaselineAdjustmentInput() {
        this.baselineAdjustmentInput = _.sumBy(this.currentMonthData, (data: MonthlyAnalysisSummaryDataClass) => { return data.baselineAdjustmentInput });
    }

    setBaselineAdjustmentForNew(allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>) {
        //Filter out baseline data of new facilities corresponding to the month
        //Jan account -> Baseline Year of Jan for new facility
        let allBaselineDataForNewFacilitiesThisMonth: Array<MonthlyAnalysisSummaryDataClass> = allFacilityAnalysisData.filter(summaryData => {
            let summaryDataDate: Date = new Date(summaryData.date);
            return summaryDataDate.getUTCMonth() == this.date.getUTCMonth() && (summaryData.isNew && summaryData.isBaselineYear) && (summaryData.baselineYear <= this.date.getUTCFullYear());
        });

        this.baselineAdjustmentForNew = _.sumBy(allBaselineDataForNewFacilitiesThisMonth, (data: MonthlyAnalysisSummaryDataClass) => {
            return data.energyUse;
        });
    }

    setMonthlyAnalysisCalculatedValues(previousMonthsSummaryData: Array<MonthlyAccountAnalysisDataClass>, baselineYear: number) {
        let previousMonthsAnalysisCalculatedValues: Array<MonthlyAnalysisCalculatedValuesSummation> = previousMonthsSummaryData.map(data => { return data.monthlyAnalysisCalculatedValues });
        this.monthlyAnalysisCalculatedValues = new MonthlyAnalysisCalculatedValuesSummation(this.currentMonthData, this.baselineAdjustmentForNew, previousMonthsAnalysisCalculatedValues, baselineYear, this.fiscalYear);
    }

}
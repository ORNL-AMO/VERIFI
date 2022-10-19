import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnalysisGroup, IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeterGroup, PredictorData } from "src/app/models/idb";

export function getAnalysisGroup(wasmModule: any, selectedGroup: AnalysisGroup, facilityId: string) {
    // std::string analysisType,
    let analysisType = selectedGroup.analysisType;
    // std::vector<PredictorData> predictorVariables,
    let predictorVariables = getPredictorVariablesVector(wasmModule, selectedGroup.predictorVariables);
    // std::string idbGroupId,
    let idbGroupId = selectedGroup.idbGroupId;
    // double regressionConstant,
    let regressionConstant = checkNullDouble(selectedGroup.regressionConstant);
    // double averagePercentBaseload,
    let averagePercentBaseload = checkNullDouble(selectedGroup.averagePercentBaseload);
    // bool hasBaselineAdjustment,
    let hasBaselineAdjustment = checkNullDouble(selectedGroup.hasBaselineAdjustement);
    // std::vector<BaselineAdjustments> baselineAdjustments
    let baselineAdjustments = getBaselineAdjustments(wasmModule, selectedGroup.baselineAdjustments);
    let group = new wasmModule.AnalysisGroup(analysisType, predictorVariables, idbGroupId, regressionConstant, averagePercentBaseload, hasBaselineAdjustment, baselineAdjustments, facilityId);
    predictorVariables.delete();
    baselineAdjustments.delete();
    return group;
}

export function getPredictorVariablesVector(wasmModule: any, predictorVariables: Array<PredictorData>) {
    let predictorVariablesVector = new wasmModule.PredictorDataVector();
    predictorVariables.forEach(variable => {
        let wasmVariable = new wasmModule.PredictorData(variable.productionInAnalysis, checkNullDouble(variable.amount), variable.id, checkNullDouble(variable.regressionCoefficient));
        predictorVariablesVector.push_back(wasmVariable);
        wasmVariable.delete();
    });
    return predictorVariablesVector;
}

export function getBaselineAdjustments(wasmModule: any, baselineAdjustments: Array<{ year: number, amount: number }>) {
    let baselineAdjustmentsVector = new wasmModule.BaselineAdjustmentsVector();
    baselineAdjustments.forEach(adjustment => {
        let wasmAdjustment = new wasmModule.BaselineAdjustments(adjustment.year, checkNullDouble(adjustment.amount));
        baselineAdjustmentsVector.push_back(wasmAdjustment);
        wasmAdjustment.delete();
    });
    return baselineAdjustmentsVector;
}



export function getStartAndEndDate(wasmModule: any, facility: IdbFacility | IdbAccount, analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem): { baselineDate: any, endDate: any } {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;
    return {
        baselineDate: new wasmModule.AnalysisDate(baselineDate.getUTCMonth(), baselineDate.getUTCFullYear()),
        endDate: new wasmModule.AnalysisDate(endDate.getUTCMonth(), endDate.getUTCFullYear()),
    }
}

export function getCalanderizedMetersVector(wasmModule: any, calanderizedMeters: Array<CalanderizedMeter>) {
    let calanderizedMetersVector = new wasmModule.CalanderizedMeterVector();
    calanderizedMeters.forEach(cMeter => {
        let monthlyDataVector = new wasmModule.MonthlyDataVector();
        cMeter.monthlyData.forEach(dataEntry => {
            let wasmDataEntry = new wasmModule.MonthlyData(dataEntry.monthNumValue, dataEntry.year, dataEntry.energyUse);
            monthlyDataVector.push_back(wasmDataEntry);
            wasmDataEntry.delete();
        });
        let wasmMeter = new wasmModule.Meter(cMeter.meter.groupId);
        let wasmCMeter = new wasmModule.CalanderizedMeter(wasmMeter, monthlyDataVector);
        calanderizedMetersVector.push_back(wasmCMeter);
        wasmMeter.delete();
        wasmCMeter.delete();
    });
    return calanderizedMetersVector;
}

export function getPredictorEntriesVector(wasmModule: any, accountPredictorEntries: Array<IdbPredictorEntry>) {
    let predictorEntriesVector = new wasmModule.PredictorEntryVector();

    accountPredictorEntries.forEach(entry => {
        let entryDataVector = new wasmModule.PredictorDataVector();
        entry.predictors.forEach(predictor => {
            let wasmPredictor = new wasmModule.PredictorData(predictor.productionInAnalysis, checkNullDouble(predictor.amount), predictor.id, checkNullDouble(predictor.regressionCoefficient));
            entryDataVector.push_back(wasmPredictor);
            wasmPredictor.delete();
        })

        let entryDate = new Date(entry.date);
        let wasmEntryDate = new wasmModule.AnalysisDate(entryDate.getUTCMonth(), entryDate.getUTCFullYear());
        let wasmEntry = new wasmModule.PredictorEntry(entry.facilityId, entryDataVector, wasmEntryDate);
        predictorEntriesVector.push_back(wasmEntry);
        wasmEntryDate.delete();
        wasmEntry.delete();
    });
    return predictorEntriesVector;
}


export function getPredictorUsage(data: any): Array<{ predictorId: string, usage: number }> {
    let predictorUsage: Array<{ predictorId: string, usage: number }> = new Array();
    if (data.predictorUsage) {
        for (let p = 0; p < data.predictorUsage.size(); p++) {
            let pUsage = data.predictorUsage.get(p);
            predictorUsage.push({
                predictorId: pUsage.predictorId,
                usage: pUsage.usage
            });
            pUsage.delete();
        }
    }
    return predictorUsage;
}


export function parseMonthlyData(calculatedData: any, selectedGroup: AnalysisGroup): Array<MonthlyAnalysisSummaryData> {
    let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();
    for (let i = 0; i < calculatedData.size(); i++) {
        let data = calculatedData.get(i);
        let predictorUsage: Array<{ predictorId: string, usage: number }> = getPredictorUsage(data);
        monthlyAnalysisSummaryData.push({
            date: new Date(data.analysisMonth.year, data.analysisMonth.month),
            energyUse: data.monthlyAnalysisCalculatedValues.energyUse,
            modeledEnergy: data.monthlyAnalysisCalculatedValues.modeledEnergy,
            adjustedForNormalization: data.monthlyAnalysisCalculatedValues.adjustedForNormalization,
            adjusted: data.monthlyAnalysisCalculatedValues.adjusted,
            baselineAdjustmentForNormalization: data.monthlyAnalysisCalculatedValues.baselineAdjustmentForNormalization,
            baselineAdjustmentForOther: data.monthlyAnalysisCalculatedValues.baselineAdjustmentForOther,
            baselineAdjustment: data.monthlyAnalysisCalculatedValues.baselineAdjustment,
            predictorUsage: predictorUsage,
            fiscalYear: data.monthlyAnalysisCalculatedValues.fiscalYear,
            group: selectedGroup,
            SEnPI: checkValue(data.monthlyAnalysisCalculatedValues.SEnPI),
            savings: checkValue(data.monthlyAnalysisCalculatedValues.savings),
            percentSavingsComparedToBaseline: checkValue(data.monthlyAnalysisCalculatedValues.percentSavingsComparedToBaseline) * 100,
            yearToDateSavings: checkValue(data.monthlyAnalysisCalculatedValues.yearToDateSavings),
            yearToDatePercentSavings: checkValue(data.monthlyAnalysisCalculatedValues.yearToDatePercentSavings) * 100,
            rollingSavings: checkValue(data.monthlyAnalysisCalculatedValues.rollingSavings),
            rolling12MonthImprovement: checkValue(data.monthlyAnalysisCalculatedValues.rolling12MonthImprovement) * 100,
        });
        data.delete();
    }
    return monthlyAnalysisSummaryData;
}

export function parseAnnualData(calculatedData: any): Array<AnnualAnalysisSummary> {
    let annualAnalysisSummaryData: Array<AnnualAnalysisSummary> = new Array();
    for (let i = 0; i < calculatedData.size(); i++) {
        let data = calculatedData.get(i);
        let predictorUsage: Array<{ predictorId: string, usage: number }> = getPredictorUsage(data);
        annualAnalysisSummaryData.push({
            year: data.year,
            energyUse: data.energyUse,
            modeledEnergy: data.modeledEnergy,
            adjustedForNormalization: data.adjustedForNormalization,
            adjusted: data.adjusted,
            baselineAdjustmentForNormalization: data.baselineAdjustmentForNormalization,
            baselineAdjustmentForOther: data.baselineAdjustmentForOther,
            baselineAdjustment: data.baselineAdjustment,
            SEnPI: checkValue(data.SEnPI),
            savings: checkValue(data.savings),
            totalSavingsPercentImprovement: checkValue(data.totalSavingsPercentImprovement) * 100,
            annualSavingsPercentImprovement: checkValue(data.annualSavingsPercentImprovement) * 100,
            cummulativeSavings: checkValue(data.cummulativeSavings),
            newSavings: checkValue(data.newSavings),
            predictorUsage: predictorUsage,
        });
        data.delete();
    }
    return annualAnalysisSummaryData;
}




export function checkNull(val: any) {
    if (val == undefined) {
        return null;
    } else {
        return val;
    }
}

export function checkNullDouble(val: any) {
    if (val == undefined) {
        return 0;
    } else {
        return val;
    }
}

export function getMonthlyStartAndEndDate(facilityOrAccount: IdbFacility | IdbAccount, analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem): { baselineDate: Date, endDate: Date } {
    let baselineDate: Date;
    let endDate: Date;
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
        baselineDate = new Date(facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear, 0, 1);
        endDate = new Date(analysisItem.reportYear + 1, 0, 1);
    } else {
        if (facilityOrAccount.fiscalYearCalendarEnd) {
            baselineDate = new Date(facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear - 1, facilityOrAccount.fiscalYearMonth);
            endDate = new Date(analysisItem.reportYear, facilityOrAccount.fiscalYearMonth);
        } else {
            baselineDate = new Date(facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear, facilityOrAccount.fiscalYearMonth);
            endDate = new Date(analysisItem.reportYear + 1, facilityOrAccount.fiscalYearMonth);
        }
    }
    return {
        baselineDate: baselineDate,
        endDate: endDate
    }
}

export function checkValue(val: number): number {
    if (Math.abs(val) < .0000001) {
        return 0
    } else {
        return val;
    }
}
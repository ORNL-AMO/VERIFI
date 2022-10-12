import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { checkNull, checkNullDouble, getMonthlyStartAndEndDate, checkValue } from './helperService'

export class MonthlyGroupAnalysisWASM {
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    constructor(wasmModule: any, selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        let wasmGroup = this.getAnalysisGroup(wasmModule, selectedGroup);
        let baselineAndEndDate = this.getStartAndEndDate(wasmModule, facility, analysisItem);
        let wasmFacility = new wasmModule.Facility(facility.guid, facility.fiscalYear, facility.fiscalYearCalendarEnd, facility.fiscalYearMonth)
        let wasmCMeters = this.getCalanderizedMetersVector(wasmModule, calanderizedMeters);
        let wasmPredictorEntries = this.getPredictorEntriesVector(wasmModule, accountPredictorEntries);
        // AnalysisGroup analysisGroup,
        // AnalysisDate baselineDate,
        // AnalysisDate endDate,
        // Facility facility,
        // std::vector<CalanderizedMeter> calanderizedMeters,
        // std::vector<PredictorEntry> accountPredictorEntries
        let monthlyAnalysisSummary = new wasmModule.MonthlyAnalysisSummary(
            wasmGroup,
            baselineAndEndDate.baselineDate,
            baselineAndEndDate.endDate,
            wasmFacility,
            wasmCMeters,
            wasmPredictorEntries);
        wasmGroup.delete();
        baselineAndEndDate.endDate.delete();
        baselineAndEndDate.baselineDate.delete();
        wasmFacility.delete();
        wasmCMeters.delete();
        wasmPredictorEntries.delete();

        let calculatedData = monthlyAnalysisSummary.getMonthlyAnalysisSummaryData();
        this.monthlyAnalysisSummaryData = new Array();
        for (let i = 0; i < calculatedData.size(); i++) {
            let data = calculatedData.get(i);
            let predictorUsage: Array<{ predictorId: string, usage: number }> = new Array();
            for (let p = 0; p < data.predictorUsage.size(); p++) {
                let pUsage = data.predictorUsage.get(p);
                predictorUsage.push({
                    predictorId: pUsage.predictorId,
                    usage: pUsage.usage
                });
                pUsage.delete();
            }
            this.monthlyAnalysisSummaryData.push({
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
        calculatedData.delete();
        monthlyAnalysisSummary.delete();
    }

    getAnalysisGroup(wasmModule: any, selectedGroup: AnalysisGroup) {
        // std::string analysisType,
        let analysisType = selectedGroup.analysisType;
        // std::vector<PredictorData> predictorVariables,
        let predictorVariables = this.getPredictorVariablesVector(wasmModule, selectedGroup.predictorVariables);
        // std::string idbGroupId,
        let idbGroupId = selectedGroup.idbGroupId;
        // double regressionConstant,
        let regressionConstant = checkNullDouble(selectedGroup.regressionConstant);
        // double averagePercentBaseload,
        let averagePercentBaseload = checkNullDouble(selectedGroup.averagePercentBaseload);
        // bool hasBaselineAdjustment,
        let hasBaselineAdjustment = checkNullDouble(selectedGroup.hasBaselineAdjustement);
        // std::vector<BaselineAdjustments> baselineAdjustments
        let baselineAdjustments = this.getBaselineAdjustments(wasmModule, selectedGroup.baselineAdjustments);
        let group = new wasmModule.AnalysisGroup(analysisType, predictorVariables, idbGroupId, regressionConstant, averagePercentBaseload, hasBaselineAdjustment, baselineAdjustments);
        predictorVariables.delete();
        baselineAdjustments.delete();
        return group;
    }

    getPredictorVariablesVector(wasmModule: any, predictorVariables: Array<PredictorData>) {
        let predictorVariablesVector = new wasmModule.PredictorDataVector();
        predictorVariables.forEach(variable => {
            let wasmVariable = new wasmModule.PredictorData(variable.productionInAnalysis, checkNullDouble(variable.amount), variable.id, checkNullDouble(variable.regressionCoefficient));
            predictorVariablesVector.push_back(wasmVariable);
            wasmVariable.delete();
        });
        return predictorVariablesVector;
    }

    getBaselineAdjustments(wasmModule: any, baselineAdjustments: Array<{ year: number, amount: number }>) {
        let baselineAdjustmentsVector = new wasmModule.BaselineAdjustmentsVector();
        baselineAdjustments.forEach(adjustment => {
            let wasmAdjustment = new wasmModule.BaselineAdjustments(adjustment.year, checkNullDouble(adjustment.amount));
            baselineAdjustmentsVector.push_back(wasmAdjustment);
            wasmAdjustment.delete();
        });
        return baselineAdjustmentsVector;
    }

    getStartAndEndDate(wasmModule: any, facility: IdbFacility, analysisItem: IdbAnalysisItem): { baselineDate: any, endDate: any } {
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = getMonthlyStartAndEndDate(facility, analysisItem);
        let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
        let endDate: Date = monthlyStartAndEndDate.endDate;
        return {
            baselineDate: new wasmModule.AnalysisDate(baselineDate.getUTCMonth(), baselineDate.getUTCFullYear()),
            endDate: new wasmModule.AnalysisDate(endDate.getUTCMonth(), endDate.getUTCFullYear()),
        }
    }

    getCalanderizedMetersVector(wasmModule: any, calanderizedMeters: Array<CalanderizedMeter>) {
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

    getPredictorEntriesVector(wasmModule: any, accountPredictorEntries: Array<IdbPredictorEntry>) {
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

}
import { AnnualAnalysisSummary } from "@data/models/analysis";
import { IdbAccountAnalysisItem } from "@data/models/idbModels/accountAnalysisItem";
import { ConvertValue } from "../conversions/convertValue";

export function getBetterPlantsReportYears(baselineYear: number, reportYear: number, includeAllYears: boolean): Array<number> {
    if (reportYear < baselineYear) {
        return [];
    }

    if (reportYear === baselineYear || !includeAllYears) {
        return [reportYear];
    }

    const reportYears: Array<number> = [];
    for (let year = reportYear; year > baselineYear; year--) {
        reportYears.push(year);
    }
    return reportYears;
}

export function convertBetterPlantsAnnualSummary(summary: AnnualAnalysisSummary, analysisItem: IdbAccountAnalysisItem): AnnualAnalysisSummary {
    let startingUnit: string = analysisItem.energyUnit;
    let neededUnits: 'MMBtu' | 'kgal' = 'MMBtu';
    if (analysisItem.analysisCategory === 'water') {
        neededUnits = 'kgal';
        startingUnit = analysisItem.waterUnit;
    }

    return {
        ...summary,
        energyUse: new ConvertValue(summary.energyUse, startingUnit, neededUnits).convertedValue,
        adjusted: new ConvertValue(summary.adjusted, startingUnit, neededUnits).convertedValue,
        baselineAdjustmentForNormalization: new ConvertValue(summary.baselineAdjustmentForNormalization, startingUnit, neededUnits).convertedValue,
        baselineAdjustmentForOtherV2: new ConvertValue(summary.baselineAdjustmentForOtherV2, startingUnit, neededUnits).convertedValue,
        baselineAdjustment: new ConvertValue(summary.baselineAdjustment, startingUnit, neededUnits).convertedValue,
        savings: new ConvertValue(summary.savings, startingUnit, neededUnits).convertedValue,
        cummulativeSavings: new ConvertValue(summary.cummulativeSavings, startingUnit, neededUnits).convertedValue,
        newSavings: new ConvertValue(summary.newSavings, startingUnit, neededUnits).convertedValue
    };
}

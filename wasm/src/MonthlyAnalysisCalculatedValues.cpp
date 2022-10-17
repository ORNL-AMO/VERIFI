#include "MonthlyAnalysisCalculatedValues.h"

void MonthlyAnalysisCalculatedValues::initializeYearToDateValues(std::vector<MonthlyAnalysisCalculatedValues> previousMonthsValues)
{
    summaryDataIndex = previousMonthsValues.size();
    if (summaryDataIndex == 0)
    {
        monthIndex = 0;
        yearToDateBaselineActualEnergyUse = 0;
        yearToDateModeledEnergyUse = 0;
        yearToDateActualEnergyUse = 0;
        yearToDateBaselineModeledEnergyUse = 0;
        yearToDateAdjustedEnergyUse = 0;
    }
    else
    {
        MonthlyAnalysisCalculatedValues previousMonthSummaryData = previousMonthsValues[summaryDataIndex - 1];
        if (previousMonthSummaryData.fiscalYear == fiscalYear)
        {
            monthIndex = previousMonthSummaryData.monthIndex + 1;
            yearToDateBaselineActualEnergyUse = previousMonthSummaryData.yearToDateBaselineActualEnergyUse;
            yearToDateModeledEnergyUse = previousMonthSummaryData.yearToDateModeledEnergyUse;
            yearToDateActualEnergyUse = previousMonthSummaryData.yearToDateActualEnergyUse;
            yearToDateBaselineModeledEnergyUse = previousMonthSummaryData.yearToDateBaselineModeledEnergyUse;
            yearToDateAdjustedEnergyUse = previousMonthSummaryData.yearToDateAdjustedEnergyUse;
        }
        else
        {
            monthIndex = 0;
            yearToDateBaselineActualEnergyUse = 0;
            yearToDateModeledEnergyUse = 0;
            yearToDateActualEnergyUse = 0;
            yearToDateBaselineModeledEnergyUse = 0;
            yearToDateAdjustedEnergyUse = 0;
        }
    }
};
void MonthlyAnalysisCalculatedValues::setYearToDateBaselineActualEnergyUse(double baselineActualEnergyUse)
{
    yearToDateBaselineActualEnergyUse = yearToDateBaselineActualEnergyUse + baselineActualEnergyUse;
};
void MonthlyAnalysisCalculatedValues::setYearToDateModeledEnergyUse()
{
    yearToDateModeledEnergyUse = yearToDateModeledEnergyUse + modeledEnergy;
};
void MonthlyAnalysisCalculatedValues::setYearToDateActualEnergyUse()
{
    yearToDateActualEnergyUse = yearToDateActualEnergyUse + energyUse;
};
void MonthlyAnalysisCalculatedValues::setBaselineModeledEnergyUse(int baselineYear, std::vector<MonthlyAnalysisCalculatedValues> previousMonthsValues)
{
    if (fiscalYear == baselineYear)
    {
        baselineModeledEnergyUse = modeledEnergy;
    }
    else
    {
        baselineModeledEnergyUse = previousMonthsValues[monthIndex].modeledEnergy;
    }
    yearToDateBaselineModeledEnergyUse = yearToDateBaselineModeledEnergyUse + baselineModeledEnergyUse;
};
void MonthlyAnalysisCalculatedValues::setAdjustedForNormalization(double baselineActualEnergyUse)
{
    adjustedForNormalization = modeledEnergy + baselineActualEnergyUse - baselineModeledEnergyUse;
};
void MonthlyAnalysisCalculatedValues::setAdjusted(double baselineAdjustmentForOther)
{
    adjusted = adjustedForNormalization + baselineAdjustmentForOther;
    yearToDateAdjustedEnergyUse = yearToDateAdjustedEnergyUse + adjusted;
};
void MonthlyAnalysisCalculatedValues::setSEnPI()
{
    SEnPI = energyUse / adjusted;
};
void MonthlyAnalysisCalculatedValues::setSavings()
{
    savings = adjusted - energyUse;
};
void MonthlyAnalysisCalculatedValues::setPercentSavingsComparedToBaseline()
{
    percentSavingsComparedToBaseline = savings / adjusted;
};
void MonthlyAnalysisCalculatedValues::setYearToDateSavings(int baselineYear)
{
    if (fiscalYear != baselineYear)
    {
        yearToDateSavings = (yearToDateBaselineActualEnergyUse - yearToDateBaselineModeledEnergyUse) - (yearToDateActualEnergyUse - yearToDateModeledEnergyUse);
    }
    else
    {
        yearToDateSavings = 0;
    }
};
void MonthlyAnalysisCalculatedValues::setBaselineAdjustmentForNormalization(double baselineActualEnergyUse)
{
    if (summaryDataIndex >= 11)
    {
        baselineAdjustmentForNormalization = adjustedForNormalization - baselineActualEnergyUse;
    }
    else
    {
        baselineAdjustmentForNormalization = 0;
    }
};
void MonthlyAnalysisCalculatedValues::setBaselineAdjustment(double baselineAdjustmentForOther)
{
    if (summaryDataIndex >= 11)
    {
        baselineAdjustment = baselineAdjustmentForNormalization + baselineAdjustmentForOther;
    }
    else
    {
        baselineAdjustment = 0;
    }
};
void MonthlyAnalysisCalculatedValues::setRollingSavingsValues(std::vector<MonthlyAnalysisCalculatedValues> previousMonthValues, int baselineYear)
{
    if (summaryDataIndex > 11)
    {
        double totalBaselineModeledEnergy = 0;
        double totalBaselineEnergy = 0;
        double total12MonthsEnergyUse = energyUse;
        double total12MonthsModeledEnergy = modeledEnergy;
        double total12MonthsAdjusedBaseline = adjusted;
        for (int i = 0; i < previousMonthValues.size(); i++)
        {
            if (previousMonthValues[i].fiscalYear == baselineYear)
            {
                totalBaselineModeledEnergy += previousMonthValues[i].modeledEnergy;
                totalBaselineEnergy += previousMonthValues[i].energyUse;
            }
            if (i >= summaryDataIndex - 11 && i <= summaryDataIndex)
            {
                total12MonthsEnergyUse += previousMonthValues[i].energyUse;
                total12MonthsModeledEnergy += previousMonthValues[i].modeledEnergy;
                total12MonthsAdjusedBaseline += previousMonthValues[i].adjusted;
            }
        }
        rollingSavings = (totalBaselineEnergy - totalBaselineModeledEnergy) - (total12MonthsEnergyUse - total12MonthsModeledEnergy);
        rolling12MonthImprovement = rollingSavings / total12MonthsAdjusedBaseline;
    }
    else
    {
        rolling12MonthImprovement = 0;
        rollingSavings = 0;
    }
};
void MonthlyAnalysisCalculatedValues::setYearToDatePercentSavings()
{
    yearToDatePercentSavings = (yearToDateSavings / yearToDateAdjustedEnergyUse);
};
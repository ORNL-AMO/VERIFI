#include "AnnualAnalysisSummaryData.h"

std::vector<MonthlyAnalysisSummaryData> AnnualAnalysisSummaryData::getYearAnalysisSummaryData(std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData)
{
    std::vector<MonthlyAnalysisSummaryData> yearMonthlyAnalysisSummaryData;
    for (int i = 0; i < monthlyAnalysisSummaryData.size(); i++)
    {
        if (monthlyAnalysisSummaryData[i].fiscalYear == year)
        {
            yearMonthlyAnalysisSummaryData.push_back(monthlyAnalysisSummaryData[i]);
        }
    }
    return yearMonthlyAnalysisSummaryData;
};
std::vector<MonthlyAnalysisSummaryData> AnnualAnalysisSummaryData::getYearAnalysisSummaryData(std::vector<MonthlyFacilityAnalysisData> monthlyAnalysisSummaryData)
{
    std::vector<MonthlyAnalysisSummaryData> yearMonthlyAnalysisSummaryData;
    for (int i = 0; i < monthlyAnalysisSummaryData.size(); i++)
    {
        if (monthlyAnalysisSummaryData[i].fiscalYear == year)
        {
            MonthlyAnalysisSummaryData convertedDataItem = MonthlyAnalysisSummaryData(
                monthlyAnalysisSummaryData[i].analysisMonth,
                monthlyAnalysisSummaryData[i].energyUse,
                monthlyAnalysisSummaryData[i].modeledEnergy,
                monthlyAnalysisSummaryData[i].baselineAdjustmentForOther,
                monthlyAnalysisSummaryData[i].fiscalYear,
                monthlyAnalysisSummaryData[i].monthlyAnalysisCalculatedValues,
                monthlyAnalysisSummaryData[i].predictorUsage);
            yearMonthlyAnalysisSummaryData.push_back(convertedDataItem);
        }
    }
    return yearMonthlyAnalysisSummaryData;
};

std::vector<MonthlyAnalysisSummaryData> AnnualAnalysisSummaryData::getYearAnalysisSummaryData(std::vector<MonthlyAccountAnalysisData> monthlyAnalysisSummaryData)
{
    std::vector<MonthlyAnalysisSummaryData> yearMonthlyAnalysisSummaryData;
    for (int i = 0; i < monthlyAnalysisSummaryData.size(); i++)
    {
        if (monthlyAnalysisSummaryData[i].fiscalYear == year)
        {
            std::vector<PredictorUsage> predictorUsage;
            MonthlyAnalysisSummaryData convertedDataItem = MonthlyAnalysisSummaryData(
                monthlyAnalysisSummaryData[i].analysisMonth,
                monthlyAnalysisSummaryData[i].energyUse,
                monthlyAnalysisSummaryData[i].modeledEnergy,
                monthlyAnalysisSummaryData[i].baselineAdjustmentForOther,
                monthlyAnalysisSummaryData[i].fiscalYear,
                monthlyAnalysisSummaryData[i].monthlyAnalysisCalculatedValues,
                predictorUsage);
            yearMonthlyAnalysisSummaryData.push_back(convertedDataItem);
        }
    }
    return yearMonthlyAnalysisSummaryData;
};

void AnnualAnalysisSummaryData::setEnergyUse(std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData)
{
    std::vector<MonthlyAnalysisSummaryData> yearMonthlyAnalysisSummaryData = getYearAnalysisSummaryData(monthlyAnalysisSummaryData);
    energyUse = 0;
    modeledEnergy = 0;
    baselineAdjustmentForOther = 0;
    for (int i = 0; i < yearMonthlyAnalysisSummaryData.size(); i++)
    {
        energyUse += yearMonthlyAnalysisSummaryData[i].energyUse;
        modeledEnergy += yearMonthlyAnalysisSummaryData[i].modeledEnergy;
        baselineAdjustmentForOther += yearMonthlyAnalysisSummaryData[i].baselineAdjustmentForOther;
    }
};
void AnnualAnalysisSummaryData::setEnergyUse(std::vector<MonthlyFacilityAnalysisData> monthlyAnalysisSummaryData)
{
    std::vector<MonthlyAnalysisSummaryData> yearMonthlyAnalysisSummaryData = getYearAnalysisSummaryData(monthlyAnalysisSummaryData);
    energyUse = 0;
    modeledEnergy = 0;
    baselineAdjustmentForOther = 0;
    for (int i = 0; i < yearMonthlyAnalysisSummaryData.size(); i++)
    {
        energyUse += yearMonthlyAnalysisSummaryData[i].energyUse;
        modeledEnergy += yearMonthlyAnalysisSummaryData[i].modeledEnergy;
        baselineAdjustmentForOther += yearMonthlyAnalysisSummaryData[i].baselineAdjustmentForOther;
    }
};
void AnnualAnalysisSummaryData::setEnergyUse(std::vector<MonthlyAccountAnalysisData> monthlyAnalysisSummaryData)
{
    std::vector<MonthlyAnalysisSummaryData> yearMonthlyAnalysisSummaryData = getYearAnalysisSummaryData(monthlyAnalysisSummaryData);
    energyUse = 0;
    modeledEnergy = 0;
    baselineAdjustmentForOther = 0;
    for (int i = 0; i < yearMonthlyAnalysisSummaryData.size(); i++)
    {
        energyUse += yearMonthlyAnalysisSummaryData[i].energyUse;
        modeledEnergy += yearMonthlyAnalysisSummaryData[i].modeledEnergy;
        baselineAdjustmentForOther += yearMonthlyAnalysisSummaryData[i].baselineAdjustmentForOther;
    }
};
// void AnnualAnalysisSummaryData::setModeledEnergy()
// {
//     modeledEnergy = 0;
//     for (int i = 0; i < yearMonthlyAnalysisSummaryData.size(); i++)
//     {
//         modeledEnergy += yearMonthlyAnalysisSummaryData[i].modeledEnergy;
//     }
// };
void AnnualAnalysisSummaryData::setBaselineEnergyUse(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData)
{
    if (previousYearsSummaryData.size() != 0)
    {
        baselineEnergyUse = previousYearsSummaryData[0].baselineEnergyUse;
    }
    else
    {
        baselineEnergyUse = energyUse;
    }
};
void AnnualAnalysisSummaryData::setBaselineModeledEnergy(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData)
{
    if (previousYearsSummaryData.size() != 0)
    {
        baselineModeledEnergyUse = previousYearsSummaryData[0].baselineModeledEnergyUse;
    }
    else
    {
        baselineModeledEnergyUse = modeledEnergy;
    }
};
void AnnualAnalysisSummaryData::setAdjustedForNormalization()
{
    adjustedForNormalization = modeledEnergy + baselineEnergyUse - baselineModeledEnergyUse;
};
// void AnnualAnalysisSummaryData::setBaselineAdjustmentForOther()
// {
//     baselineAdjustmentForOther = 0;
//     for (int i = 0; i < yearMonthlyAnalysisSummaryData.size(); i++)
//     {
//         baselineAdjustmentForOther += yearMonthlyAnalysisSummaryData[i].baselineAdjustmentForOther;
//     }
// };
void AnnualAnalysisSummaryData::setBaselineAdjustmentForNormalization(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData)
{
    if (previousYearsSummaryData.size() != 0)
    {
        baselineAdjustmentForNormalization = adjustedForNormalization - baselineEnergyUse;
    }
    else
    {
        baselineAdjustmentForNormalization = 0;
    }
};
void AnnualAnalysisSummaryData::setBaselineAdjustment(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData)
{
    if (previousYearsSummaryData.size() != 0)
    {
        baselineAdjustment = baselineAdjustmentForNormalization + baselineAdjustmentForOther;
    }
    else
    {
        baselineAdjustment = 0;
    }
};
void AnnualAnalysisSummaryData::setAdjusted()
{
    adjusted = adjustedForNormalization + baselineAdjustmentForOther;
};
void AnnualAnalysisSummaryData::setSEnPI()
{
    SEnPI = energyUse / adjusted;
};
void AnnualAnalysisSummaryData::setSavings(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData)
{
    if (previousYearsSummaryData.size() != 0)
    {
        savings = adjusted - energyUse;
    }
    else
    {
        savings = 0;
    }
};
void AnnualAnalysisSummaryData::setTotalSavingsPercentImprovement()
{
    totalSavingsPercentImprovement = savings / adjusted;
};
void AnnualAnalysisSummaryData::setPreviousYearSavings(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData)
{
    if (previousYearsSummaryData.size() != 0)
    {
        for (int i = 0; i < previousYearsSummaryData.size(); i++)
        {
            if (previousYearsSummaryData[i].year == year - 1)
            {
                previousYearPercentSavings = previousYearsSummaryData[i].totalSavingsPercentImprovement;
                previousYearSavings = previousYearsSummaryData[i].savings;
                i = previousYearsSummaryData.size();
            }
        }
    }
    else
    {
        previousYearSavings = 0;
        previousYearPercentSavings = 0;
    }
};
void AnnualAnalysisSummaryData::setAnnualSavingsPercentImprovement()
{
    annualSavingsPercentImprovement = totalSavingsPercentImprovement - previousYearPercentSavings;
};
void AnnualAnalysisSummaryData::setCummulativeSavings(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData)
{
    if (previousYearsSummaryData.size() != 0)
    {
        for (int i = 0; i < previousYearsSummaryData.size(); i++)
        {
            if (previousYearsSummaryData[i].year == year - 1)
            {
                cummulativeSavings = previousYearsSummaryData[i].cummulativeSavings + savings;
                i = previousYearsSummaryData.size();
            }
        }
    }
    else
    {
        cummulativeSavings = 0;
    }
};
void AnnualAnalysisSummaryData::setNewSavings()
{
    newSavings = savings - previousYearSavings;
};

void AnnualAnalysisSummaryData::setPredictorUsage(std::vector<MonthlyFacilityAnalysisData> monthlyAnalysisSummaryData)
{
    for (int i = 0; i < monthlyAnalysisSummaryData.size(); i++)
    {
        if (monthlyAnalysisSummaryData[i].fiscalYear == year)
        {
            if (predictorUsage.size() == 0)
            {
                for (int p = 0; p < monthlyAnalysisSummaryData[i].predictorUsage.size(); p++)
                {
                    predictorUsage.push_back(monthlyAnalysisSummaryData[i].predictorUsage[p]);
                }
            }
            else
            {
                for (int p = 0; p < monthlyAnalysisSummaryData[i].predictorUsage.size(); p++)
                {
                    predictorUsage[p].usage += monthlyAnalysisSummaryData[i].predictorUsage[p].usage;
                }
            }
        }
    }
};

void AnnualAnalysisSummaryData::setPredictorUsage(std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData)
{
    for (int i = 0; i < monthlyAnalysisSummaryData.size(); i++)
    {
        if (monthlyAnalysisSummaryData[i].fiscalYear == year)
        {
            if (predictorUsage.size() == 0)
            {
                for (int p = 0; p < monthlyAnalysisSummaryData[i].predictorUsage.size(); p++)
                {
                    predictorUsage.push_back(monthlyAnalysisSummaryData[i].predictorUsage[p]);
                }
            }
            else
            {
                for (int p = 0; p < monthlyAnalysisSummaryData[i].predictorUsage.size(); p++)
                {
                    predictorUsage[p].usage += monthlyAnalysisSummaryData[i].predictorUsage[p].usage;
                }
            }
        }
    }
};

// bool AnnualAnalysisSummaryData::checkEntry(PredictorEntry predictorEntry, Facility facility)
// {
//     if (facility.fiscalYear == "calanderYear")
//     {
//         if (predictorEntry.date.year == year)
//         {
//             return true;
//         }
//         else
//         {
//             return false;
//         }
//     }
//     else
//     {
//         AnalysisDate startDate = AnalysisDate(facility.fiscalYearMonth, year);
//         AnalysisDate endDate = AnalysisDate(facility.fiscalYearMonth, year + 1);
//         if (predictorEntry.date.year < startDate.year || predictorEntry.date.year > endDate.year)
//         {
//             return false;
//         }
//         else
//         {
//             if (predictorEntry.date.year == startDate.year)
//             {
//                 if (predictorEntry.date.month >= startDate.month)
//                 {
//                     return true;
//                 }
//                 else
//                 {
//                     return false;
//                 }
//             }
//             else if (predictorEntry.date.year == endDate.year)
//             {
//                 if (predictorEntry.date.month <= endDate.month)
//                 {
//                     return true;
//                 }
//                 else
//                 {
//                     return false;
//                 }
//             }
//         }
//     }
//     return false;
// }
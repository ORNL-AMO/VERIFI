#include "AnnualAnalysisSummaryData.h"

void AnnualAnalysisSummaryData::setYearAnalysisSummaryData(std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData)
{
    for (int i = 0; i < monthlyAnalysisSummaryData.size(); i++)
    {
        if (monthlyAnalysisSummaryData[i].fiscalYear == year)
        {
            yearMonthlyAnalysisSummaryData.push_back(monthlyAnalysisSummaryData[i]);
        }
    }
};
void AnnualAnalysisSummaryData::setEnergyUse()
{
    energyUse = 0;
    for (int i = 0; i < yearMonthlyAnalysisSummaryData.size(); i++)
    {
        energyUse += yearMonthlyAnalysisSummaryData[i].energyUse;
    }
};
void AnnualAnalysisSummaryData::setModeledEnergy()
{
    modeledEnergy = 0;
    for (int i = 0; i < yearMonthlyAnalysisSummaryData.size(); i++)
    {
        modeledEnergy += yearMonthlyAnalysisSummaryData[i].modeledEnergy;
    }
};
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
void AnnualAnalysisSummaryData::setBaselineAdjustmentForOther()
{
    baselineAdjustmentForOther = 0;
    for (int i = 0; i < yearMonthlyAnalysisSummaryData.size(); i++)
    {
        baselineAdjustmentForOther += yearMonthlyAnalysisSummaryData[i].baselineAdjustmentForOther;
    }
};
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

void AnnualAnalysisSummaryData::setPredictorUsage(std::vector<PredictorEntry> accountPredictorEntries, Facility facility)
{
    std::vector<PredictorEntry> facilityPredictorData;
    for (int i = 0; i < accountPredictorEntries.size(); i++)
    {
        if (accountPredictorEntries[i].facilityId == facility.guid)
        {
            if (checkEntry(accountPredictorEntries[i], facility))
            {
                facilityPredictorData.push_back(accountPredictorEntries[i]);
            }
        }
    }

    if (facilityPredictorData.size() != 0)
    {
        std::vector<PredictorData> predictorVariables = facilityPredictorData[0].predictors;
        for (int p = 0; p < predictorVariables.size(); p++)
        {
            double usageVal = 0;
            for (int i = 0; i < facilityPredictorData.size(); i++)
            {
                for (int x = 0; x < facilityPredictorData[i].predictors.size(); x++)
                {
                    if (predictorVariables[p].id == facilityPredictorData[i].predictors[x].id)
                    {
                        usageVal += facilityPredictorData[i].predictors[x].amount;
                    }
                }
            }
            PredictorUsage predictorUsageVar = PredictorUsage(usageVal, predictorVariables[p].id);
            predictorUsage.push_back(predictorUsageVar);
        }
    }
};

bool AnnualAnalysisSummaryData::checkEntry(PredictorEntry predictorEntry, Facility facility)
{
    if (facility.fiscalYear == "calanderYear")
    {
        if (predictorEntry.date.year == year)
        {
            return true;
        }
        else
        {
            return false;
        }
    }
    else
    {
        AnalysisDate startDate = AnalysisDate(facility.fiscalYearMonth, year);
        AnalysisDate endDate = AnalysisDate(facility.fiscalYearMonth, year + 1);
        if (predictorEntry.date.year < startDate.year || predictorEntry.date.year > endDate.year)
        {
            return false;
        }
        else
        {
            if (predictorEntry.date.year == startDate.year)
            {
                if (predictorEntry.date.month >= startDate.month)
                {
                    return true;
                }
                else
                {
                    return false;
                }
            }
            else if (predictorEntry.date.year == endDate.year)
            {
                if (predictorEntry.date.month <= endDate.month)
                {
                    return true;
                }
                else
                {
                    return false;
                }
            }
        }
    }
    return false;
}
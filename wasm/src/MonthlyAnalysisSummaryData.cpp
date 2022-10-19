#include "MonthlyAnalysisSummaryData.h"
#include <iostream>

void MonthlyAnalysisSummaryData::setFiscalYear(Facility facility)
{
    if (facility.fiscalYear == "calendarYear")
    {
        fiscalYear = analysisMonth.year;
    }
    else
    {
        if (facility.fiscalYearCalendarEnd)
        {
            if (analysisMonth.month >= facility.fiscalYearMonth)
            {
                fiscalYear = analysisMonth.year + 1;
            }
            else
            {
                fiscalYear = analysisMonth.year;
            }
        }
        else
        {
            if (analysisMonth.month >= facility.fiscalYearMonth)
            {
                fiscalYear = analysisMonth.year;
            }
            else
            {
                fiscalYear = analysisMonth.year - 1;
            }
        }
    }
};
void MonthlyAnalysisSummaryData::setMonthPredictorData(std::vector<PredictorEntry> facilityPredictorData)
{
    for (int i = 0; i < facilityPredictorData.size(); i++)
    {
        if (facilityPredictorData[i].date.month == analysisMonth.month && facilityPredictorData[i].date.year == analysisMonth.year)
        {
            monthPredictorData.push_back(facilityPredictorData[i]);
        }
    }
};
void MonthlyAnalysisSummaryData::setMonthMeterData(std::vector<MonthlyData> allMonthlyData)
{
    for (int i = 0; i < allMonthlyData.size(); i++)
    {
        if (allMonthlyData[i].month == analysisMonth.month && allMonthlyData[i].year == analysisMonth.year)
        {
            monthMeterData.push_back(allMonthlyData[i]);
        }
    }
};
void MonthlyAnalysisSummaryData::setEnergyUse()
{
    energyUse = 0;
    for (int i = 0; i < monthMeterData.size(); i++)
    {
        energyUse += monthMeterData[i].energyUse;
    }
};
void MonthlyAnalysisSummaryData::setMonthIndex(std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData)
{
    int summaryDataIndex = previousMonthsSummaryData.size();
    if (summaryDataIndex == 0)
    {
        monthIndex = 0;
    }
    else
    {
        if (previousMonthsSummaryData[summaryDataIndex - 1].fiscalYear == fiscalYear)
        {
            monthIndex = previousMonthsSummaryData[summaryDataIndex - 1].monthIndex + 1;
        }
        else
        {
            monthIndex = 0;
        }
    }
};
void MonthlyAnalysisSummaryData::setBaselineActualEnergyUse(int baselineYear, std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData)
{
    if (fiscalYear == baselineYear)
    {
        baselineActualEnergyUse = energyUse;
    }
    else
    {
        baselineActualEnergyUse = previousMonthsSummaryData[monthIndex].energyUse;
    }
};
void MonthlyAnalysisSummaryData::setPredictorAndProductionUsage(std::vector<PredictorData> predictorVariables)
{
    for (int i = 0; i < predictorVariables.size(); i++)
    {
        double usageVal = 0;
        for (int m = 0; m < monthPredictorData.size(); m++)
        {
            for (int d = 0; d < monthPredictorData[m].predictors.size(); d++)
            {
                if (monthPredictorData[m].predictors[d].id == predictorVariables[i].id)
                {
                    usageVal += monthPredictorData[m].predictors[d].amount;
                    d = monthPredictorData[m].predictors.size();
                }
            }
            predictorUsage.push_back(PredictorUsage(usageVal, predictorVariables[i].id));
            if (predictorVariables[i].productionInAnalysis)
            {
                productionUsage.push_back(usageVal);
            }
        }
    }
};
void MonthlyAnalysisSummaryData::setModeledEnergy(std::string analysisType, std::vector<PredictorData> predictorVariables, double baselineYearEnergyIntensity)
{
    if (analysisType == "regression")
    {
        modeledEnergy = calculateRegressionModeledEnergy(predictorVariables);
    }
    else if (analysisType == "absoluteEnergyConsumption")
    {
        modeledEnergy = baselineActualEnergyUse;
    }
    else if (analysisType == "energyIntensity")
    {
        modeledEnergy = calculateEnergyIntensityModeledEnergy(baselineYearEnergyIntensity);
    }
    else if (analysisType == "modifiedEnergyIntensity")
    {
        modeledEnergy = calculateModifiedEnegyIntensityModeledEnergy(baselineYearEnergyIntensity);
    }
    if (modeledEnergy < 0)
    {
        modeledEnergy = 0;
    }
};
double MonthlyAnalysisSummaryData::calculateRegressionModeledEnergy(std::vector<PredictorData> predictorVariables)
{
    modeledEnergy = 0;
    for (int i = 0; i < predictorVariables.size(); i++)
    {
        double usageVal = 0;
        for (int m = 0; m < monthPredictorData.size(); m++)
        {
            for (int d = 0; d < monthPredictorData[m].predictors.size(); d++)
            {
                if (monthPredictorData[m].predictors[d].id == predictorVariables[i].id)
                {
                    usageVal += monthPredictorData[m].predictors[d].amount;
                    d = monthPredictorData[m].predictors.size();
                }
            }
        }
        modeledEnergy += (usageVal * predictorVariables[i].regressionCoefficient);
    }
    modeledEnergy += monthlyGroupAnalysis.selectedGroup.regressionConstant;
    return modeledEnergy;
};

double MonthlyAnalysisSummaryData::calculateEnergyIntensityModeledEnergy(double baselineYearEnergyIntensity)
{
    double totalProductionUsage = getTotalProductionUsage();
    return (totalProductionUsage * baselineYearEnergyIntensity);
};

double MonthlyAnalysisSummaryData::calculateModifiedEnegyIntensityModeledEnergy(double baselineYearEnergyIntensity)
{
    double totalProductionUsage = getTotalProductionUsage();
    double baseLoad = monthlyGroupAnalysis.selectedGroup.averagePercentBaseload / 100;
    return (baselineYearEnergyIntensity * totalProductionUsage * (1 - baseLoad) + (baselineActualEnergyUse * baseLoad));
};
void MonthlyAnalysisSummaryData::setAnnualEnergyUse(std::vector<AnnualUsage> annualUsage)
{
    annualEnergyUse = 0;
    for (int i = 0; i < annualUsage.size(); i++)
    {
        if (annualUsage[i].year == analysisMonth.year)
        {
            annualEnergyUse = annualUsage[i].usage;
        }
    }
};
void MonthlyAnalysisSummaryData::setBaselineAdjustmentForOther(int baselineYear)
{
    baselineAdjustmentForOther = 0;
    if (monthlyGroupAnalysis.selectedGroup.hasBaselineAdjustment && analysisMonth.year != baselineYear)
    {
        for (int i = 0; i < monthlyGroupAnalysis.selectedGroup.baselineAdjustments.size(); i++)
        {
            if (monthlyGroupAnalysis.selectedGroup.baselineAdjustments[i].year == analysisMonth.year)
            {
                if (monthlyGroupAnalysis.selectedGroup.baselineAdjustments[i].amount)
                {
                    baselineAdjustmentForOther = (energyUse / annualEnergyUse) * monthlyGroupAnalysis.selectedGroup.baselineAdjustments[i].amount;
                }
                i = monthlyGroupAnalysis.selectedGroup.baselineAdjustments.size();
            }
        }
    }
};
void MonthlyAnalysisSummaryData::setMonthlyAnalysisCalculatedValues(int baselineYear, std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData)
{
    std::vector<MonthlyAnalysisCalculatedValues> previousMonthsAnalysisCalculatedValues;
    for (int i = 0; i < previousMonthsSummaryData.size(); i++)
    {
        previousMonthsAnalysisCalculatedValues.push_back(previousMonthsSummaryData[i].monthlyAnalysisCalculatedValues);
    }

    monthlyAnalysisCalculatedValues = MonthlyAnalysisCalculatedValues(
        energyUse,
        modeledEnergy,
        baselineAdjustmentForOther,
        fiscalYear,
        monthlyGroupAnalysis.baselineDate.year,
        previousMonthsAnalysisCalculatedValues,
        baselineActualEnergyUse);
};

double MonthlyAnalysisSummaryData::getTotalProductionUsage()
{
    double totalProductionUsage = 0;
    for (int i = 0; i < productionUsage.size(); i++)
    {
        totalProductionUsage += productionUsage[i];
    }
    return totalProductionUsage;
}
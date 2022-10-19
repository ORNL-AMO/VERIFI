#include "MonthlyFacilityAnalysisData.h"

std::vector<MonthlyAnalysisSummaryData> MonthlyFacilityAnalysisData::getCurrentMonthData(std::vector<MonthlyAnalysisSummaryData> allFacilityAnalysisData)
{
    std::vector<MonthlyAnalysisSummaryData> currentMonthData;
    for (int i = 0; i < allFacilityAnalysisData.size(); i++)
    {
        if (allFacilityAnalysisData[i].analysisMonth.month == analysisMonth.month && allFacilityAnalysisData[i].analysisMonth.year == analysisMonth.year)
        {
            currentMonthData.push_back(allFacilityAnalysisData[i]);
        }
    }
    return currentMonthData;
};
std::vector<PredictorEntry> MonthlyFacilityAnalysisData::getMonthPredictorData(std::vector<PredictorEntry> facilityPredictorEntries)
{
    std::vector<PredictorEntry> currentMonthPredictorData;
    for (int i = 0; i < facilityPredictorEntries.size(); i++)
    {
        if (facilityPredictorEntries[i].date.month == analysisMonth.month && facilityPredictorEntries[i].date.year == analysisMonth.year)
        {
            currentMonthPredictorData.push_back(facilityPredictorEntries[i]);
        }
    }
    return currentMonthPredictorData;
};
void MonthlyFacilityAnalysisData::setPredictorUsage(std::vector<PredictorEntry> facilityPredictorEntries)
{
    std::vector<PredictorEntry> currentMonthPredictorData = getMonthPredictorData(facilityPredictorEntries);
    if (facilityPredictorEntries.size() != 0)
    {
        for (int i = 0; i < facilityPredictorEntries[0].predictors.size(); i++)
        {
            double usageVal = 0;
            for (int m = 0; m < currentMonthPredictorData.size(); m++)
            {
                for (int d = 0; d < currentMonthPredictorData[m].predictors.size(); d++)
                {
                    if (currentMonthPredictorData[m].predictors[d].id == facilityPredictorEntries[0].predictors[i].id)
                    {
                        usageVal += currentMonthPredictorData[m].predictors[d].amount;
                        d = currentMonthPredictorData[m].predictors.size();
                    }
                }
                predictorUsage.push_back(PredictorUsage(usageVal, facilityPredictorEntries[0].predictors[i].id));
            }
        }
    }
};

void MonthlyFacilityAnalysisData::setFiscalYear(Facility facility)
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
void MonthlyFacilityAnalysisData::setEnergyUse(std::vector<MonthlyAnalysisSummaryData> allFacilityAnalysisData)
{
    std::vector<MonthlyAnalysisSummaryData> currentMonthData = getCurrentMonthData(allFacilityAnalysisData);
    energyUse = 0;
    modeledEnergy = 0;
    baselineAdjustmentForOther = 0;
    for (int i = 0; i < currentMonthData.size(); i++)
    {
        energyUse += currentMonthData[i].energyUse;
        modeledEnergy += currentMonthData[i].modeledEnergy;
        baselineAdjustmentForOther += currentMonthData[i].baselineAdjustmentForOther;
    }
};
void MonthlyFacilityAnalysisData::setMonthIndex(std::vector<MonthlyFacilityAnalysisData> previousMonthsSummaryData)
{
    int summaryDataIndex = previousMonthsSummaryData.size();
    if (summaryDataIndex == 0)
    {
        monthIndex = 0;
    }
    else
    {
        MonthlyFacilityAnalysisData previousMonthSummaryData = previousMonthsSummaryData[summaryDataIndex - 1];
        if (previousMonthSummaryData.fiscalYear == fiscalYear)
        {
            monthIndex = previousMonthSummaryData.monthIndex + 1;
        }
        else
        {
            monthIndex = 0;
        }
    }
};
void MonthlyFacilityAnalysisData::setBaselineActualEnergyUse(int baselineYear, std::vector<MonthlyFacilityAnalysisData> previousMonthsSummaryData)
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
void MonthlyFacilityAnalysisData::setMonthlyAnalysisCalculatedValues(int baselineYear, std::vector<MonthlyFacilityAnalysisData> previousMonthsSummaryData)
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
        baselineYear,
        previousMonthsAnalysisCalculatedValues,
        baselineActualEnergyUse);
};
#include "MonthlyAccountAnalysisData.h"

void MonthlyAccountAnalysisData::setFiscalYear(Facility facility)
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
std::vector<MonthlyFacilityAnalysisData> MonthlyAccountAnalysisData::getCurrentMonthData(std::vector<MonthlyFacilityAnalysisData> allFacilityAnalysisData)
{
    std::vector<MonthlyFacilityAnalysisData> currentMonthData;
    for (int i = 0; i < allFacilityAnalysisData.size(); i++)
    {
        if (allFacilityAnalysisData[i].analysisMonth.month == analysisMonth.month && allFacilityAnalysisData[i].analysisMonth.year == analysisMonth.year)
        {
            currentMonthData.push_back(allFacilityAnalysisData[i]);
        }
    }
    return currentMonthData;
};
void MonthlyAccountAnalysisData::setEnergyUse(std::vector<MonthlyFacilityAnalysisData> allFacilityAnalysisData)
{
    std::vector<MonthlyFacilityAnalysisData> currentMonthData = getCurrentMonthData(allFacilityAnalysisData);
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
void MonthlyAccountAnalysisData::setMonthIndex(std::vector<MonthlyAccountAnalysisData> previousMonthsSummaryData)
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
void MonthlyAccountAnalysisData::setBaselineActualEnergyUse(int baselineYear, std::vector<MonthlyAccountAnalysisData> previousMonthsSummaryData)
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
void MonthlyAccountAnalysisData::setMonthlyAnalysisCalculatedValues(int baselineYear, std::vector<MonthlyAccountAnalysisData> previousMonthsSummaryData)
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
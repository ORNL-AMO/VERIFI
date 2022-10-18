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
void MonthlyAccountAnalysisData::setCurrentMonthData(std::vector<MonthlyFacilityAnalysisData> allFacilityAnalysisData)
{
    for (int i = 0; i < allFacilityAnalysisData.size(); i++)
    {
        if (allFacilityAnalysisData[i].analysisMonth.month == analysisMonth.month && allFacilityAnalysisData[i].analysisMonth.year == analysisMonth.year)
        {
            currentMonthData.push_back(allFacilityAnalysisData[i]);
        }
    }
};
void MonthlyAccountAnalysisData::setEnergyUse()
{
    energyUse = 0;
    for (int i = 0; i < currentMonthData.size(); i++)
    {
        energyUse += currentMonthData[i].energyUse;
    }
};
void MonthlyAccountAnalysisData::setModeledEnergy()
{
    modeledEnergy = 0;
    for (int i = 0; i < currentMonthData.size(); i++)
    {
        modeledEnergy += currentMonthData[i].modeledEnergy;
    }
};
void MonthlyAccountAnalysisData::setBaselineAdjustmentForOther()
{
    baselineAdjustmentForOther = 0;
    for (int i = 0; i < currentMonthData.size(); i++)
    {
        baselineAdjustmentForOther += currentMonthData[i].baselineAdjustmentForOther;
    }
    // TODO add baseline adjustment numbers for account
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
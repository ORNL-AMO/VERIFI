#include "MonthlyAnalysisSummary.h"
#include <iostream>

std::vector<MonthlyAnalysisSummaryData> MonthlyAnalysisSummary::getMonthlyAnalysisSummaryData()
{
    std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData;
    AnalysisDate currentMonthDate = AnalysisDate(baselineDate.month, baselineDate.year);
    while (currentMonthDate.month != endDate.month || currentMonthDate.year != endDate.year)
    {   
        MonthlyAnalysisSummaryData currentMonthyAnalysisSummaryData = MonthlyAnalysisSummaryData(
            monthlyGroupAnalysis,
            currentMonthDate,
            monthlyAnalysisSummaryData);

        monthlyAnalysisSummaryData.push_back(currentMonthyAnalysisSummaryData);
        currentMonthDate.nextMonth();
    }
    return monthlyAnalysisSummaryData;
};
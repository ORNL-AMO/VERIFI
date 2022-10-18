#include "MonthlyFacilityAnalysis.h"

void MonthlyFacilityAnalysis::setMonthlyGroupAnalysis(std::vector<AnalysisGroup> selectedGroups, std::vector<CalanderizedMeter> calanderizedMeters, std::vector<PredictorEntry> accountPredictorEntries, AnalysisDate baselineDate,
                                                      AnalysisDate endDate)
{
    for (int i = 0; i < selectedGroups.size(); i++)
    {
        MonthlyAnalysisSummary monthlyGroupAnalysis = MonthlyAnalysisSummary(
            selectedGroups[i],
            baselineDate,
            endDate,
            facility,
            calanderizedMeters,
            accountPredictorEntries);
        std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData = monthlyGroupAnalysis.getMonthlyAnalysisSummaryData();
        for (int x = 0; x < monthlyAnalysisSummaryData.size(); x++)
        {
            monthlyGroupAnalysisData.push_back(monthlyAnalysisSummaryData[x]);
        }
    }
};

void MonthlyFacilityAnalysis::setFacilityPredictorEntries(std::vector<PredictorEntry> accountPredictorEntries)
{
    for (int i = 0; i < accountPredictorEntries.size(); i++)
    {
        if (accountPredictorEntries[i].facilityId == facility.guid)
        {
            facilityPredictorEntries.push_back(accountPredictorEntries[i]);
        }
    }
}

std::vector<MonthlyFacilityAnalysisData> MonthlyFacilityAnalysis::getMonthlyFacilityAnalysisData()
{
    std::cout << "getMonthlyFacilityAnalysisData" << std::endl;
    std::vector<MonthlyFacilityAnalysisData> monthlyAnalysisSummaryData;
    AnalysisDate currentMonthDate = AnalysisDate(baselineDate.month, baselineDate.year);
    while (currentMonthDate.month != endDate.month || currentMonthDate.year != endDate.year)
    {

        std::cout << "currentMonthDate.month: " << currentMonthDate.month  << std::endl;
        std::cout << "currentMonthDate.year: " << currentMonthDate.year  << std::endl;
        MonthlyFacilityAnalysisData currentMonthyAnalysisSummaryData = MonthlyFacilityAnalysisData(
            monthlyGroupAnalysisData,
            currentMonthDate,
            facilityPredictorEntries,
            monthlyAnalysisSummaryData,
            baselineDate.year,
            facility);
        std::cout << "COMPLETED!" << std::endl;
        monthlyAnalysisSummaryData.push_back(currentMonthyAnalysisSummaryData);
        currentMonthDate.nextMonth();
    }
    return monthlyAnalysisSummaryData;
}
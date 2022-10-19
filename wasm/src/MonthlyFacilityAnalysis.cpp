#include "MonthlyFacilityAnalysis.h"

std::vector<MonthlyAnalysisSummaryData> MonthlyFacilityAnalysis::getMonthlyGroupAnalysis(std::vector<AnalysisGroup> selectedGroups,
                                                                                         std::vector<CalanderizedMeter> calanderizedMeters, std::vector<PredictorEntry> accountPredictorEntries)
{
    std::vector<MonthlyAnalysisSummaryData> monthlyGroupAnalysisData;
    for (int i = 0; i < selectedGroups.size(); i++)
    {
        MonthlyAnalysisSummary monthlyGroupAnalysis = MonthlyAnalysisSummary(baselineDate, endDate);
        std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData = monthlyGroupAnalysis.getMonthlyAnalysisSummaryData(selectedGroups[i],
                                                                                                                                facility,
                                                                                                                                calanderizedMeters,
                                                                                                                                accountPredictorEntries);
        for (int x = 0; x < monthlyAnalysisSummaryData.size(); x++)
        {
            monthlyGroupAnalysisData.push_back(monthlyAnalysisSummaryData[x]);
        }
    }
    return monthlyGroupAnalysisData;
};

std::vector<PredictorEntry> MonthlyFacilityAnalysis::getFacilityPredictorEntries(std::vector<PredictorEntry> accountPredictorEntries)
{
    std::vector<PredictorEntry> facilityPredictorEntries;
    for (int i = 0; i < accountPredictorEntries.size(); i++)
    {
        if (accountPredictorEntries[i].facilityId == facility.guid)
        {
            facilityPredictorEntries.push_back(accountPredictorEntries[i]);
        }
    }
    return facilityPredictorEntries;
}

std::vector<MonthlyFacilityAnalysisData> MonthlyFacilityAnalysis::getMonthlyFacilityAnalysisData(std::vector<AnalysisGroup> selectedGroups,
                                                                                                 std::vector<CalanderizedMeter> calanderizedMeters,
                                                                                                 std::vector<PredictorEntry> accountPredictorEntries)
{
    std::vector<PredictorEntry> facilityPredictorEntries = getFacilityPredictorEntries(accountPredictorEntries);
    std::vector<MonthlyAnalysisSummaryData> monthlyGroupAnalysisData = getMonthlyGroupAnalysis(selectedGroups, calanderizedMeters, facilityPredictorEntries);
    std::vector<MonthlyFacilityAnalysisData> monthlyAnalysisSummaryData;
    AnalysisDate currentMonthDate = AnalysisDate(baselineDate.month, baselineDate.year);
    while (currentMonthDate.month != endDate.month || currentMonthDate.year != endDate.year)
    {
        MonthlyFacilityAnalysisData currentMonthyAnalysisSummaryData = MonthlyFacilityAnalysisData(
            monthlyGroupAnalysisData,
            currentMonthDate,
            facilityPredictorEntries,
            monthlyAnalysisSummaryData,
            baselineDate.year,
            facility);
        monthlyAnalysisSummaryData.push_back(currentMonthyAnalysisSummaryData);
        currentMonthDate.nextMonth();
    }
    return monthlyAnalysisSummaryData;
}
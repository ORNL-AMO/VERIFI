#include "MonthlyFacilityAnalysis.h"

void MonthlyFacilityAnalysis::setMonthlyGroupAnalysis(std::vector<AnalysisGroup> selectedGroups, Facility facility, std::vector<CalanderizedMeter> calanderizedMeters, std::vector<PredictorEntry> accountPredictorEntries, AnalysisDate baselineDate,
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

void MonthlyFacilityAnalysis::setFacilityPredictorEntries(std::vector<PredictorEntry> accountPredictorEntries, Facility facility)
{
    for (int i = 0; i < accountPredictorEntries.size(); i++)
    {
        if (accountPredictorEntries[i].facilityId == facility.guid)
        {
            facilityPredictorEntries.push_back(accountPredictorEntries[i]);
        }
    }
}
#include "MonthlyAccountAnalysis.h"

std::vector<MonthlyFacilityAnalysisData> MonthlyAccountAnalysis::getFacilityAnalysisItems(std::vector<Facility> facilities, std::vector<AnalysisGroup> allAccountGroups, std::vector<CalanderizedMeter> calanderizedMeters, std::vector<PredictorEntry> accountPredictorEntries)
{
    std::vector<MonthlyFacilityAnalysisData> allMonthlyAnalysisData;
    for (int i = 0; i < facilities.size(); i++)
    {
        std::vector<AnalysisGroup> facilityGroups;
        for (int x = 0; x < allAccountGroups.size(); x++)
        {
            if (allAccountGroups[x].facilityId == facilities[i].guid)
            {
                facilityGroups.push_back(allAccountGroups[x]);
            }
        }
        MonthlyFacilityAnalysis monthlyFacilityAnalysis = MonthlyFacilityAnalysis(facilities[i], baselineDate, endDate);
        std::vector<MonthlyFacilityAnalysisData> monthlyFacilityAnalysisData = monthlyFacilityAnalysis.getMonthlyFacilityAnalysisData(facilityGroups, calanderizedMeters, accountPredictorEntries);
        for (int x = 0; x < monthlyFacilityAnalysisData.size(); x++)
        {
            allMonthlyAnalysisData.push_back(monthlyFacilityAnalysisData[x]);
        }
    }
    return allMonthlyAnalysisData;
};

std::vector<AnnualUsage> MonthlyAccountAnalysis::getAnnualUsageValues(std::vector<MonthlyFacilityAnalysisData> allMonthlyAnalysisData)
{
    std::vector<AnnualUsage> annualUsageValues;
    for (int i = baselineDate.year; i <= endDate.year; i++)
    {
        double annualUsage = 0;
        for (int x = 0; x < allMonthlyAnalysisData.size(); x++)
        {
            if (allMonthlyAnalysisData[x].analysisMonth.year == i)
            {
                annualUsage += allMonthlyAnalysisData[x].energyUse;
            }
        }
        AnnualUsage annualUsageObj = AnnualUsage(i, annualUsage);
        annualUsageValues.push_back(annualUsageObj);
    }
    return annualUsageValues;
}

std::vector<MonthlyAccountAnalysisData> MonthlyAccountAnalysis::getMonthlyAnalysisSummaryData(std::vector<Facility> facilities,
                                                                                              std::vector<AnalysisGroup> allAccountGroups,
                                                                                              std::vector<CalanderizedMeter> calanderizedMeters,
                                                                                              std::vector<PredictorEntry> accountPredictorEntries)
{
    std::vector<MonthlyFacilityAnalysisData> allMonthlyAnalysisData = getFacilityAnalysisItems(facilities, allAccountGroups, calanderizedMeters, accountPredictorEntries);
    std::vector<AnnualUsage> annualUsageValues = getAnnualUsageValues(allMonthlyAnalysisData);
    std::vector<MonthlyAccountAnalysisData> monthlyAnalysisSummaryData;
    AnalysisDate currentMonthDate = AnalysisDate(baselineDate.month, baselineDate.year);
    while (currentMonthDate.month != endDate.month || currentMonthDate.year != endDate.year)
    {
        MonthlyAccountAnalysisData currentMonthyAnalysisSummaryData = MonthlyAccountAnalysisData(
            allMonthlyAnalysisData,
            currentMonthDate,
            monthlyAnalysisSummaryData,
            baselineDate.year,
            account,
            annualUsageValues);

        monthlyAnalysisSummaryData.push_back(currentMonthyAnalysisSummaryData);
        currentMonthDate.nextMonth();
    }
    return monthlyAnalysisSummaryData;
};
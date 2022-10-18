#include "MonthlyAccountAnalysis.h"

void MonthlyAccountAnalysis::setFacilityAnalysisItems(std::vector<Facility> facilities, std::vector<AnalysisGroup> allAccountGroups, std::vector<CalanderizedMeter> calanderizedMeters, std::vector<PredictorEntry> accountPredictorEntries)
{
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
        std::cout << "get monthly analysis: " << i << std::endl;
        MonthlyFacilityAnalysis monthlyFacilityAnalysis = MonthlyFacilityAnalysis(facilityGroups, facilities[i], calanderizedMeters,
                                                                                  accountPredictorEntries, baselineDate, endDate);

        std::cout << "get monthly analysis completed...: " << i << std::endl;
        facilityAnalysisItems.push_back(monthlyFacilityAnalysis);
    }
};

void MonthlyAccountAnalysis::setAllMonthlySummaries()
{
    std::cout << "setAllMonthlySummaries" << std::endl;
    for (int i = 0; i < facilityAnalysisItems.size(); i++)
    {
        std::cout << "getMonthlyFacilityAnalysisData: " << i << std::endl;
        std::vector<MonthlyFacilityAnalysisData> monthlyFacilityAnalysisData = facilityAnalysisItems[i].getMonthlyFacilityAnalysisData();
        std::cout << "getMonthlyFacilityAnalysisData done...: " << i << std::endl;
        for (int x = 0; x < monthlyFacilityAnalysisData.size(); x++)
        {
            allMonthlyAnalysisData.push_back(monthlyFacilityAnalysisData[x]);
        }
    }
}

void MonthlyAccountAnalysis::setAnnualUsageValues()
{
    std::cout << "setAnnualUsageValues" << std::endl;
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
}

std::vector<MonthlyAccountAnalysisData> MonthlyAccountAnalysis::getMonthlyAnalysisSummaryData()
{
    std::cout << "getMonthlyAnalysisSummaryData" << std::endl;
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
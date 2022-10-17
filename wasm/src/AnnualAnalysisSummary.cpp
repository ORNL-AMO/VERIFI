
#include "AnnualAnalysisSummary.h"

std::vector<AnnualAnalysisSummaryData> AnnualAnalysisSummary::getAnnualAnalysisSummaryData()
{
    std::vector<AnnualAnalysisSummaryData> annualAnalysisSummaryData;
    std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData = monthlyAnalysisSummary.getMonthlyAnalysisSummaryData();
    int year = baselineDate.year;
    while (year < endDate.year)
    {
        AnnualAnalysisSummaryData annualAnalysisSummary = AnnualAnalysisSummaryData(
            monthlyAnalysisSummaryData,
            year,
            accountPredictorEntries,
            facility,
            annualAnalysisSummaryData);
        annualAnalysisSummaryData.push_back(annualAnalysisSummary);
        year++;
    }
    return annualAnalysisSummaryData;
}




std::vector<AnnualAnalysisSummaryData> AnnualAnalysisSummary::getAnnualFacilitySummaryData()
{
    std::vector<AnnualAnalysisSummaryData> annualAnalysisSummaryData;
    std::vector<MonthlyFacilityAnalysisData> monthlyAnalysisSummaryData = monthlyFacilityAnalysis.getMonthlyFacilityAnalysisData();
    int year = baselineDate.year;
    while (year < endDate.year)
    {
        AnnualAnalysisSummaryData annualAnalysisSummary = AnnualAnalysisSummaryData(
            monthlyAnalysisSummaryData,
            year,
            accountPredictorEntries,
            facility,
            annualAnalysisSummaryData);
        annualAnalysisSummaryData.push_back(annualAnalysisSummary);
        year++;
    }
    return annualAnalysisSummaryData;
}
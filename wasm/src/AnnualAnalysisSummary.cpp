
#include "AnnualAnalysisSummary.h"

AnnualAnalysisResults AnnualAnalysisSummary::getAnnualAnalysisSummaryData(AnalysisGroup analysisGroup,
                                                                                           std::vector<CalanderizedMeter> calanderizedMeters,
                                                                                           std::vector<PredictorEntry> accountPredictorEntries)
{
    std::vector<AnnualAnalysisSummaryData> annualAnalysisSummaryData;
    std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData = monthlyAnalysisSummary.getMonthlyAnalysisSummaryData(analysisGroup, facility, calanderizedMeters, accountPredictorEntries);
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
    return AnnualAnalysisResults(annualAnalysisSummaryData, monthlyAnalysisSummaryData);
}

AnnualAnalysisResults AnnualAnalysisSummary::getAnnualFacilitySummaryData(std::vector<AnalysisGroup> selectedGroups,
                                                                                           std::vector<CalanderizedMeter> calanderizedMeters,
                                                                                           std::vector<PredictorEntry> accountPredictorEntries)
{
    std::vector<AnnualAnalysisSummaryData> annualAnalysisSummaryData;
    std::vector<MonthlyFacilityAnalysisData> monthlyAnalysisSummaryData = monthlyFacilityAnalysis.getMonthlyFacilityAnalysisData(selectedGroups, calanderizedMeters, accountPredictorEntries);
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
    return AnnualAnalysisResults(annualAnalysisSummaryData, monthlyAnalysisSummaryData);
}

AnnualAnalysisResults AnnualAnalysisSummary::getAnnualAccountSummaryData(std::vector<Facility> facilities,
                                                                                          std::vector<AnalysisGroup> allAccountGroups,
                                                                                          std::vector<CalanderizedMeter> calanderizedMeters,
                                                                                          std::vector<PredictorEntry> accountPredictorEntries)
{
    std::vector<AnnualAnalysisSummaryData> annualAnalysisSummaryData;
    std::vector<MonthlyAccountAnalysisData> monthlyAnalysisSummaryData = monthlyAccountAnalysis.getMonthlyAnalysisSummaryData(facilities, allAccountGroups, calanderizedMeters, accountPredictorEntries);
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
    return AnnualAnalysisResults(annualAnalysisSummaryData, monthlyAnalysisSummaryData);
}
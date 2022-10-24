#include <vector>
#include "Facility.h"
#include "AnalysisGroup.h"
#include "CalanderizedMeter.h"
#include "PredictorEntry.h"
#include "MonthlyFacilityAnalysis.h"
#include "MonthlyAccountAnalysisData.h"
#ifndef MONTHLYACCOUNTANALYSIS_H
#define MONTHLYACCOUNTANALYSIS_H

class MonthlyAccountAnalysisResults
{
public:
    /**
     * @brief
     *
     */
    MonthlyAccountAnalysisResults(){};
    MonthlyAccountAnalysisResults(std::vector<MonthlyAccountAnalysisData> monthlyAccountResults, std::vector<MonthlyFacilityAnalysisData> monthlyFacilityResults) : monthlyAccountResults(monthlyAccountResults), monthlyFacilityResults(monthlyFacilityResults){};

    std::vector<MonthlyAccountAnalysisData> monthlyAccountResults;
    std::vector<MonthlyFacilityAnalysisData> monthlyFacilityResults;

};

class MonthlyAccountAnalysis
{
public:
    /**
     * @brief
     *
     */
    MonthlyAccountAnalysis(){};
    MonthlyAccountAnalysis(
        AnalysisDate baselineDate,
        AnalysisDate endDate,
        Facility account) : baselineDate(baselineDate), endDate(endDate), account(account){};

    AnalysisDate baselineDate;
    AnalysisDate endDate;
    Facility account;
    std::vector<MonthlyFacilityAnalysisData> getFacilityAnalysisItems(std::vector<Facility> facilities,
                                                                      std::vector<AnalysisGroup> allAccountGroups,
                                                                      std::vector<CalanderizedMeter> calanderizedMeters,
                                                                      std::vector<PredictorEntry> accountPredictorEntries);

    std::vector<AnnualUsage> getAnnualUsageValues(std::vector<MonthlyFacilityAnalysisData> allMonthlyAnalysisData);
    MonthlyAccountAnalysisResults getMonthlyAnalysisSummaryData(std::vector<Facility> facilities,
                                                                std::vector<AnalysisGroup> allAccountGroups,
                                                                std::vector<CalanderizedMeter> calanderizedMeters,
                                                                std::vector<PredictorEntry> accountPredictorEntries);
};

#endif // MONTHLYACCOUNTANALYSIS_H
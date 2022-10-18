#include <vector>
#include "Facility.h"
#include "AnalysisGroup.h"
#include "CalanderizedMeter.h"
#include "PredictorEntry.h"
#include "MonthlyFacilityAnalysis.h"
#include "MonthlyAccountAnalysisData.h"
#ifndef MONTHLYACCOUNTANALYSIS_H
#define MONTHLYACCOUNTANALYSIS_H
class MonthlyAccountAnalysis
{
public:
    /**
     * @brief
     *
     */
    MonthlyAccountAnalysis(){};
    MonthlyAccountAnalysis(
        std::vector<Facility> facilities,
        std::vector<AnalysisGroup> allAccountGroups,
        std::vector<CalanderizedMeter> calanderizedMeters,
        std::vector<PredictorEntry> accountPredictorEntries,
        AnalysisDate baselineDate,
        AnalysisDate endDate,
        Facility account) : baselineDate(baselineDate), endDate(endDate), account(account)
    {
        std::cout << "Made it here.. " << std::endl;
        setFacilityAnalysisItems(facilities, allAccountGroups, calanderizedMeters, accountPredictorEntries);
        setAllMonthlySummaries();
        setAnnualUsageValues();
    };

    std::vector<MonthlyFacilityAnalysis> facilityAnalysisItems;
    std::vector<MonthlyFacilityAnalysisData> allMonthlyAnalysisData;
    AnalysisDate baselineDate;
    AnalysisDate endDate;
    Facility account;
    std::vector<AnnualUsage> annualUsageValues;
    void setFacilityAnalysisItems(std::vector<Facility> facilities,
                                  std::vector<AnalysisGroup> allAccountGroups,
                                  std::vector<CalanderizedMeter> calanderizedMeters,
                                  std::vector<PredictorEntry> accountPredictorEntries);
    void setAllMonthlySummaries();
    void setAnnualUsageValues();
    std::vector<MonthlyAccountAnalysisData> getMonthlyAnalysisSummaryData();
};

#endif // MONTHLYACCOUNTANALYSIS_H
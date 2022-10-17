#include <vector>
#include "Facility.h"
#include "AnalysisGroup.h"
#include "CalanderizedMeter.h"
#include "PredictorEntry.h"
#include "MonthlyFacilityAnalysis.h"
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
        AnalysisDate endDate) : baselineDate(baselineDate), endDate(endDate){

                                                            };

    std::vector<MonthlyFacilityAnalysis> facilityAnalysisItems;
    AnalysisDate baselineDate;
    AnalysisDate endDate;
    void setFacilityAnalysisItems(std::vector<Facility> facilities,
                                  std::vector<AnalysisGroup> allAccountGroups,
                                  std::vector<CalanderizedMeter> calanderizedMeters,
                                  std::vector<PredictorEntry> accountPredictorEntries);
};

#endif // MONTHLYACCOUNTANALYSIS_H
#include "AnalysisGroup.h"
#include "Facility.h"
#include "CalanderizedMeter.h"
#include "MonthlyData.h"
#include "PredictorEntry.h"
#include "Helper.h"
#include <vector>
#include "AnalysisDate.h"
#include "MonthlyAnalysisSummary.h"

#ifndef MONTHLYACCOUNTANALYSIS_H
#define MONTHLYACCOUNTANALYSIS_H
class MonthlyFacilityAnalysis
{
public:
    /**
     * @brief
     *
     */
    MonthlyFacilityAnalysis(){};

    MonthlyFacilityAnalysis(
        std::vector<AnalysisGroup> selectedGroups,
        Facility facility,
        std::vector<CalanderizedMeter> calanderizedMeters,
        std::vector<PredictorEntry> accountPredictorEntries,
        AnalysisDate baselineDate,
        AnalysisDate endDate){

    };

    std::vector<MonthlyAnalysisSummaryData> monthlyGroupAnalysisData;
    std::vector<PredictorEntry> facilityPredictorEntries;


    void setMonthlyGroupAnalysis(std::vector<AnalysisGroup> selectedGroups, Facility facility, std::vector<CalanderizedMeter> calanderizedMeters, std::vector<PredictorEntry> accountPredictorEntries, AnalysisDate baselineDate,
                                 AnalysisDate endDate);
    void setFacilityPredictorEntries(std::vector<PredictorEntry> accountPredictorEntries, Facility facility);

};

#endif // MONTHLYACCOUNTANALYSIS_H
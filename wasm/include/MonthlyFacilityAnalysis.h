#include "AnalysisGroup.h"
#include "Facility.h"
#include "CalanderizedMeter.h"
#include "MonthlyData.h"
#include "PredictorEntry.h"
#include "Helper.h"
#include <vector>
#include "AnalysisDate.h"
#include "MonthlyAnalysisSummary.h"
#include "MonthlyFacilityAnalysisData.h"
#ifndef MONTHLYFACILITYANALYSIS_H
#define MONTHLYFACILITYANALYSIS_H
class MonthlyFacilityAnalysis
{
public:
    /**
     * @brief
     *
     */
    MonthlyFacilityAnalysis(){};

    MonthlyFacilityAnalysis(
        Facility facility,
        AnalysisDate baselineDate,
        AnalysisDate endDate) : endDate(endDate), baselineDate(baselineDate), facility(facility){};

    AnalysisDate baselineDate;
    AnalysisDate endDate;
    Facility facility;

    std::vector<MonthlyAnalysisSummaryData> getMonthlyGroupAnalysis(std::vector<AnalysisGroup> selectedGroups, std::vector<CalanderizedMeter> calanderizedMeters, std::vector<PredictorEntry> accountPredictorEntries);
    std::vector<PredictorEntry> getFacilityPredictorEntries(std::vector<PredictorEntry> accountPredictorEntries);
    std::vector<MonthlyFacilityAnalysisData> getMonthlyFacilityAnalysisData(std::vector<AnalysisGroup> selectedGroups,
                                                                            std::vector<CalanderizedMeter> calanderizedMeters,
                                                                            std::vector<PredictorEntry> accountPredictorEntries);
};

#endif // MONTHLYFACILITYANALYSIS_H
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
        std::vector<AnalysisGroup> selectedGroups,
        Facility facility,
        std::vector<CalanderizedMeter> calanderizedMeters,
        std::vector<PredictorEntry> accountPredictorEntries,
        AnalysisDate baselineDate,
        AnalysisDate endDate) : endDate(endDate), baselineDate(baselineDate), facility(facility)
    {
        setMonthlyGroupAnalysis(selectedGroups, calanderizedMeters, accountPredictorEntries, baselineDate, endDate);
        setFacilityPredictorEntries(accountPredictorEntries);
    };

    AnalysisDate baselineDate;
    AnalysisDate endDate;
    Facility facility;
    std::vector<MonthlyAnalysisSummaryData> monthlyGroupAnalysisData;
    std::vector<PredictorEntry> facilityPredictorEntries;

    void setMonthlyGroupAnalysis(std::vector<AnalysisGroup> selectedGroups, std::vector<CalanderizedMeter> calanderizedMeters, std::vector<PredictorEntry> accountPredictorEntries, AnalysisDate baselineDate,
                                 AnalysisDate endDate);
    void setFacilityPredictorEntries(std::vector<PredictorEntry> accountPredictorEntries);
    std::vector<MonthlyFacilityAnalysisData> getMonthlyFacilityAnalysisData();
};

#endif // MONTHLYFACILITYANALYSIS_H
#include "MonthlyGroupAnalysis.h"
#include "AnalysisGroup.h"
#include "AnalysisDate.h"
#include "Facility.h"
#include "CalanderizedMeter.h"
#include "PredictorEntry.h"
#include "MonthlyAnalysisSummary.h"
#include "MonthlyFacilityAnalysis.h"
#include "AnnualAnalysisSummaryData.h"
#include <iostream>

#ifndef ANNUALANALYSISSUMMARY_H
#define ANNUALANALYSISSUMMARY_H
class AnnualAnalysisSummary
{
public:
    /**
     * @brief
     *
     */
    AnnualAnalysisSummary(){};

    AnnualAnalysisSummary(
        AnalysisDate baselineDate,
        AnalysisDate endDate,
        Facility facility) : baselineDate(baselineDate), endDate(endDate), facility(facility)
    {
        monthlyAnalysisSummary = MonthlyAnalysisSummary(
            baselineDate,
            endDate);
    };

    AnnualAnalysisSummary(
        Facility facility,
        AnalysisDate baselineDate,
        AnalysisDate endDate,
        bool neededForWASM) : baselineDate(baselineDate), endDate(endDate), facility(facility)
    {
        monthlyFacilityAnalysis = MonthlyFacilityAnalysis(
            facility,
            baselineDate,
            endDate);
    };

    AnalysisDate baselineDate;
    AnalysisDate endDate;
    MonthlyAnalysisSummary monthlyAnalysisSummary;
    MonthlyFacilityAnalysis monthlyFacilityAnalysis;
    // std::vector<PredictorEntry> accountPredictorEntries;
    Facility facility;
    std::vector<AnnualAnalysisSummaryData> getAnnualAnalysisSummaryData(AnalysisGroup analysisGroup,
                                                                        std::vector<CalanderizedMeter> calanderizedMeters,
                                                                        std::vector<PredictorEntry> accountPredictorEntries);

    std::vector<AnnualAnalysisSummaryData> getAnnualFacilitySummaryData(std::vector<AnalysisGroup> selectedGroups,
                                                                        std::vector<CalanderizedMeter> calanderizedMeters,
                                                                        std::vector<PredictorEntry> accountPredictorEntries);
};

#endif // ANNUALANALYSISSUMMARY_H
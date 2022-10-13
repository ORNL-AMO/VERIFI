#include "MonthlyGroupAnalysis.h"
#include "AnalysisGroup.h"
#include "AnalysisDate.h"
#include "Facility.h"
#include "CalanderizedMeter.h"
#include "PredictorEntry.h"
#include "MonthlyAnalysisSummary.h"
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
        AnalysisGroup analysisGroup,
        AnalysisDate baselineDate,
        AnalysisDate endDate,
        Facility facility,
        std::vector<CalanderizedMeter> calanderizedMeters,
        std::vector<PredictorEntry> accountPredictorEntries) : baselineDate(baselineDate), endDate(endDate), accountPredictorEntries(accountPredictorEntries), facility(facility)
    {
        monthlyAnalysisSummary = MonthlyAnalysisSummary(
            analysisGroup,
            baselineDate,
            endDate,
            facility,
            calanderizedMeters,
            accountPredictorEntries);
    };

    AnalysisDate baselineDate;
    AnalysisDate endDate;
    MonthlyAnalysisSummary monthlyAnalysisSummary;
    std::vector<PredictorEntry> accountPredictorEntries;
    Facility facility;
    std::vector<AnnualAnalysisSummaryData> getAnnualAnalysisSummaryData();
};

#endif // ANNUALANALYSISSUMMARY_H
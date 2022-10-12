
#include "MonthlyGroupAnalysis.h"
#include "AnalysisGroup.h"
#include "AnalysisDate.h"
#include "Facility.h"
#include "CalanderizedMeter.h"
#include "PredictorEntry.h"
#include "MonthlyAnalysisSummaryData.h"

#include <iostream>

#ifndef MONTHLYANALYSISSUMMARY_H
#define MONTHLYANALYSISSUMMARY_H
class MonthlyAnalysisSummary
{
public:
    /**
     * @brief
     *
     */

    MonthlyAnalysisSummary(){};

    MonthlyAnalysisSummary(
        AnalysisGroup analysisGroup,
        AnalysisDate baselineDate,
        AnalysisDate endDate,
        Facility facility,
        std::vector<CalanderizedMeter> calanderizedMeters,
        std::vector<PredictorEntry> accountPredictorEntries) : baselineDate(baselineDate), endDate(endDate)
    {
        monthlyGroupAnalysis = MonthlyGroupAnalysis(
            analysisGroup,
            facility,
            calanderizedMeters,
            accountPredictorEntries,
            baselineDate,
            endDate);
        // setMonthlyAnalysisSummaryData(baselineDate, endDate);
    };

    AnalysisDate baselineDate;
    AnalysisDate endDate;
    MonthlyGroupAnalysis monthlyGroupAnalysis;
    std::vector<MonthlyAnalysisSummaryData> getMonthlyAnalysisSummaryData();
};

#endif // MONTHLYANALYSISSUMMARY_H
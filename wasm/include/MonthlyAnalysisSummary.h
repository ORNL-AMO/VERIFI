
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
        AnalysisDate baselineDate,
        AnalysisDate endDate) : baselineDate(baselineDate), endDate(endDate){};

    AnalysisDate baselineDate;
    AnalysisDate endDate;
    std::vector<MonthlyAnalysisSummaryData> getMonthlyAnalysisSummaryData(AnalysisGroup analysisGroup,
                                                                          Facility facility,
                                                                          std::vector<CalanderizedMeter> calanderizedMeters,
                                                                          std::vector<PredictorEntry> accountPredictorEntries);
};

#endif // MONTHLYANALYSISSUMMARY_H
#include "MonthlyGroupAnalysis.h"
#include "AnalysisGroup.h"
#include "AnalysisDate.h"
#include "Facility.h"
#include "CalanderizedMeter.h"
#include "PredictorEntry.h"
#include "MonthlyAnalysisSummary.h"
#include "MonthlyFacilityAnalysis.h"
#include "AnnualAnalysisSummaryData.h"
#include "MonthlyAccountAnalysis.h"
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

    AnnualAnalysisSummary(
        AnalysisDate baselineDate,
        AnalysisDate endDate,
        Facility account,
        bool neededForWasm,
        bool alsoNeededForWasmOverload) : baselineDate(baselineDate), endDate(endDate), facility(account)
    {
        monthlyAccountAnalysis = MonthlyAccountAnalysis(baselineDate, endDate, account);
    }

    AnalysisDate baselineDate;
    AnalysisDate endDate;
    MonthlyAnalysisSummary monthlyAnalysisSummary;
    MonthlyFacilityAnalysis monthlyFacilityAnalysis;
    MonthlyAccountAnalysis monthlyAccountAnalysis;
    // std::vector<PredictorEntry> accountPredictorEntries;
    Facility facility;
    std::vector<AnnualAnalysisSummaryData> getAnnualAnalysisSummaryData(AnalysisGroup analysisGroup,
                                                                        std::vector<CalanderizedMeter> calanderizedMeters,
                                                                        std::vector<PredictorEntry> accountPredictorEntries);

    std::vector<AnnualAnalysisSummaryData> getAnnualFacilitySummaryData(std::vector<AnalysisGroup> selectedGroups,
                                                                        std::vector<CalanderizedMeter> calanderizedMeters,
                                                                        std::vector<PredictorEntry> accountPredictorEntries);

    std::vector<AnnualAnalysisSummaryData> getAnnualAccountSummaryData(std::vector<Facility> facilities,
                                                                       std::vector<AnalysisGroup> allAccountGroups,
                                                                       std::vector<CalanderizedMeter> calanderizedMeters,
                                                                       std::vector<PredictorEntry> accountPredictorEntries);
};

#endif // ANNUALANALYSISSUMMARY_H
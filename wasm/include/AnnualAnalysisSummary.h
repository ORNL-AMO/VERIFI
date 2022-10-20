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

class AnnualAnalysisResults
{
public:
    /**
     * @brief
     *
     */
    AnnualAnalysisResults(){};
    AnnualAnalysisResults(
        std::vector<AnnualAnalysisSummaryData> annualAnalysisSummaryData,
        std::vector<MonthlyAccountAnalysisData> monthlyAccountAnalysisSummaryData)
        : annualAnalysisSummaryData(annualAnalysisSummaryData), monthlyAccountAnalysisSummaryData(monthlyAccountAnalysisSummaryData){

                                                                };

    AnnualAnalysisResults(
        std::vector<AnnualAnalysisSummaryData> annualAnalysisSummaryData,
        std::vector<MonthlyFacilityAnalysisData> monthlyFacilityAnalysisSummaryData)
        : annualAnalysisSummaryData(annualAnalysisSummaryData), monthlyFacilityAnalysisSummaryData(monthlyFacilityAnalysisSummaryData){

                                                                };

    AnnualAnalysisResults(
        std::vector<AnnualAnalysisSummaryData> annualAnalysisSummaryData,
        std::vector<MonthlyAnalysisSummaryData> monthlyGroupAnalysisSummaryData)
        : annualAnalysisSummaryData(annualAnalysisSummaryData), monthlyGroupAnalysisSummaryData(monthlyGroupAnalysisSummaryData){

                                                                };

    std::vector<AnnualAnalysisSummaryData> annualAnalysisSummaryData;
    std::vector<MonthlyAccountAnalysisData> monthlyAccountAnalysisSummaryData;
    std::vector<MonthlyFacilityAnalysisData> monthlyFacilityAnalysisSummaryData;
    std::vector<MonthlyAnalysisSummaryData> monthlyGroupAnalysisSummaryData;
};

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
    AnnualAnalysisResults getAnnualAnalysisSummaryData(AnalysisGroup analysisGroup,
                                                       std::vector<CalanderizedMeter> calanderizedMeters,
                                                       std::vector<PredictorEntry> accountPredictorEntries);

    AnnualAnalysisResults getAnnualFacilitySummaryData(std::vector<AnalysisGroup> selectedGroups,
                                                       std::vector<CalanderizedMeter> calanderizedMeters,
                                                       std::vector<PredictorEntry> accountPredictorEntries);

    AnnualAnalysisResults getAnnualAccountSummaryData(std::vector<Facility> facilities,
                                                      std::vector<AnalysisGroup> allAccountGroups,
                                                      std::vector<CalanderizedMeter> calanderizedMeters,
                                                      std::vector<PredictorEntry> accountPredictorEntries);
};


#endif // ANNUALANALYSISSUMMARY_H
#include <vector>
#include "MonthlyAnalysisSummaryData.h"
#include "PredictorEntry.h"

#ifndef MONTHLYFACILITYANALYSISDATA_H
#define MONTHLYFACILITYANALYSISDATA_H
class MonthlyFacilityAnalysisData
{
public:
    /**
     * @brief
     *
     */
    MonthlyFacilityAnalysisData(){};

    MonthlyFacilityAnalysisData(
        std::vector<MonthlyAnalysisSummaryData> allFacilityAnalysisData,
        AnalysisDate analysisMonth,
        std::vector<PredictorEntry> facilityPredictorEntries,
        std::vector<MonthlyFacilityAnalysisData> previousMonthsSummaryData,
        int baselineYear,
        Facility facility) : analysisMonth(analysisMonth)
    {
        setPredictorUsage(facilityPredictorEntries);
        setFiscalYear(facility);
        setEnergyUse(allFacilityAnalysisData);
        setMonthIndex(previousMonthsSummaryData);
        setBaselineActualEnergyUse(baselineYear, previousMonthsSummaryData);
        setMonthlyAnalysisCalculatedValues(baselineYear, previousMonthsSummaryData);
    };

    AnalysisDate analysisMonth;
    double baselineActualEnergyUse;
    int monthIndex;
    double energyUse;
    double modeledEnergy;
    double baselineAdjustmentForOther;
    std::vector<PredictorUsage> predictorUsage;
    double fiscalYear;
    MonthlyAnalysisCalculatedValues monthlyAnalysisCalculatedValues;

    std::vector<MonthlyAnalysisSummaryData> getCurrentMonthData(std::vector<MonthlyAnalysisSummaryData> allFacilityAnalysisData);
    std::vector<PredictorEntry> getMonthPredictorData(std::vector<PredictorEntry> facilityPredictorEntries);
    void setPredictorUsage(std::vector<PredictorEntry> facilityPredictorEntries);
    void setFiscalYear(Facility facility);
    void setEnergyUse(std::vector<MonthlyAnalysisSummaryData> allFacilityAnalysisData);
    void setMonthIndex(std::vector<MonthlyFacilityAnalysisData> previousMonthsSummaryData);
    void setBaselineActualEnergyUse(int baselineYear, std::vector<MonthlyFacilityAnalysisData> previousMonthsSummaryData);
    void setMonthlyAnalysisCalculatedValues(int baselineYear, std::vector<MonthlyFacilityAnalysisData> previousMonthsSummaryData);
};

#endif //MONTHLYFACILITYANALYSISDATA_H
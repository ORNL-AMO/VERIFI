
#include <vector>
#include "MonthlyFacilityAnalysisData.h"

#ifndef MONTHLYACCOUNTANALYSISDATA_H
#define MONTHLYACCOUNTANALYSISDATA_H
class MonthlyAccountAnalysisData
{
public:
    /**
     * @brief
     *
     */
    MonthlyAccountAnalysisData(){};

    MonthlyAccountAnalysisData(
        std::vector<MonthlyFacilityAnalysisData> allFacilityAnalysisData,
        AnalysisDate analysisMonth,
        std::vector<MonthlyAccountAnalysisData> previousMonthsSummaryData,
        int baselineYear,
        Facility account,
        std::vector<AnnualUsage> annualUsageValues
        ) : analysisMonth(analysisMonth)
    {
        setFiscalYear(account);
        setEnergyUse(allFacilityAnalysisData);
        setMonthIndex(previousMonthsSummaryData);
        setBaselineActualEnergyUse(baselineYear, previousMonthsSummaryData);
        setMonthlyAnalysisCalculatedValues(baselineYear, previousMonthsSummaryData);
    };

    int fiscalYear;
    AnalysisDate analysisMonth;
    double energyUse;
    double modeledEnergy;
    double baselineAdjustmentForOther;
    MonthlyAnalysisCalculatedValues monthlyAnalysisCalculatedValues;

    double baselineActualEnergyUse;
    double monthIndex;

    void setFiscalYear(Facility facility);
    std::vector<MonthlyFacilityAnalysisData> getCurrentMonthData(std::vector<MonthlyFacilityAnalysisData> allFacilityAnalysisData);
    void setEnergyUse(std::vector<MonthlyFacilityAnalysisData> allFacilityAnalysisData);
    void setMonthIndex(std::vector<MonthlyAccountAnalysisData> previousMonthsSummaryData);
    void setBaselineActualEnergyUse(int baselineYear, std::vector<MonthlyAccountAnalysisData> previousMonthsSummaryData);
    void setMonthlyAnalysisCalculatedValues(int baselineYear, std::vector<MonthlyAccountAnalysisData> previousMonthsSummaryData);
};

#endif // MONTHLYACCOUNTANALYSISDATA_H
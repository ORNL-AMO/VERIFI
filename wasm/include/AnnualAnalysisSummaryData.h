#include "Helper.h"
#include "PredictorEntry.h"
#include "Facility.h"
#include "MonthlyAnalysisSummaryData.h"
#include <vector>

#ifndef ANNUALANALYSISSUMMARYDATA_H
#define ANNUALANALYSISSUMMARYDATA_H
class AnnualAnalysisSummaryData
{
public:
    /**
     * @brief
     *
     */
    AnnualAnalysisSummaryData(){};

    AnnualAnalysisSummaryData(
        std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData,
        int year,
        std::vector<PredictorEntry> accountPredictorEntries,
        Facility facility,
        std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData) : year(year)
    {
        setYearAnalysisSummaryData(monthlyAnalysisSummaryData);
        setPredictorUsage(monthlyAnalysisSummaryData);
        setEnergyUse();
        setModeledEnergy();
        setBaselineEnergyUse(previousYearsSummaryData);
        setBaselineModeledEnergy(previousYearsSummaryData);
        setAdjustedForNormalization();
        setBaselineAdjustmentForOther();
        setBaselineAdjustmentForNormalization(previousYearsSummaryData);
        setBaselineAdjustment(previousYearsSummaryData);
        setAdjusted();
        setSEnPI();
        setSavings(previousYearsSummaryData);
        setTotalSavingsPercentImprovement();
        setPreviousYearSavings(previousYearsSummaryData);
        setAnnualSavingsPercentImprovement();
        setCummulativeSavings(previousYearsSummaryData);
        setNewSavings();
    };

    int year;
    double energyUse;
    double modeledEnergy;
    double adjustedForNormalization;
    double adjusted;
    double baselineAdjustmentForNormalization;
    double baselineAdjustmentForOther;
    double baselineAdjustment;
    double SEnPI;
    double savings;
    double totalSavingsPercentImprovement;
    double annualSavingsPercentImprovement;
    double cummulativeSavings;
    double newSavings;
    std::vector<PredictorUsage> predictorUsage;

    // calcs
    std::vector<MonthlyAnalysisSummaryData> yearMonthlyAnalysisSummaryData;
    double baselineEnergyUse;
    double baselineModeledEnergyUse;
    double previousYearPercentSavings;
    double previousYearSavings;

    void setYearAnalysisSummaryData(std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData);
    void setPredictorUsage(std::vector<MonthlyAnalysisSummaryData> monthlyAnalysisSummaryData);
    void setEnergyUse();
    void setModeledEnergy();
    void setBaselineEnergyUse(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData);
    void setBaselineModeledEnergy(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData);
    void setAdjustedForNormalization();
    void setBaselineAdjustmentForOther();
    void setBaselineAdjustmentForNormalization(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData);
    void setBaselineAdjustment(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData);
    void setAdjusted();
    void setSEnPI();
    void setSavings(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData);
    void setTotalSavingsPercentImprovement();
    void setPreviousYearSavings(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData);
    void setAnnualSavingsPercentImprovement();
    void setCummulativeSavings(std::vector<AnnualAnalysisSummaryData> previousYearsSummaryData);
    void setNewSavings();

    bool checkEntry(PredictorEntry predictorEntry, Facility facility);
};

#endif //ANNUALANALYSISSUMMARYDATA_H
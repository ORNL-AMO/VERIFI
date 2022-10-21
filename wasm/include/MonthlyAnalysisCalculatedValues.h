
#include <vector>
#ifndef MONTHLYANALYSISCALCULATEDVALUES_H
#define MONTHLYANALYSISCALCULATEDVALUES_H






class MonthlyAnalysisCalculatedValues
{
public:
    /**
     * @brief
     *
     *
     *
     */
    MonthlyAnalysisCalculatedValues(){};

    MonthlyAnalysisCalculatedValues(
        double energyUse,
        double modeledEnergy,
        double baselineAdjustmentForOther,
        int fiscalYear,
        int baselineYear,
        std::vector<MonthlyAnalysisCalculatedValues> previousMonthsValues,
        double baselineActualEnergyUse)
        : energyUse(energyUse), modeledEnergy(modeledEnergy), fiscalYear(fiscalYear)
    {
        initializeYearToDateValues(previousMonthsValues);
        setYearToDateBaselineActualEnergyUse(baselineActualEnergyUse);
        setYearToDateModeledEnergyUse();
        setYearToDateActualEnergyUse();
        setBaselineModeledEnergyUse(baselineYear, previousMonthsValues);
        setAdjustedForNormalization(baselineActualEnergyUse);
        setAdjusted(baselineAdjustmentForOther);
        setSEnPI();
        setSavings();
        setPercentSavingsComparedToBaseline();
        setYearToDateSavings(baselineYear);
        setBaselineAdjustmentForNormalization(baselineActualEnergyUse);
        setBaselineAdjustment(baselineAdjustmentForOther);
        setRollingSavingsValues(previousMonthsValues, baselineYear);
        setYearToDatePercentSavings();
    };

    double energyUse;
    double modeledEnergy;
    double adjustedForNormalization;
    double adjusted;
    double baselineAdjustmentForNormalization;
    double baselineAdjustment;
    int fiscalYear;
    double SEnPI;
    double savings;
    double percentSavingsComparedToBaseline;
    double yearToDateSavings;
    double yearToDatePercentSavings;
    double rollingSavings;
    double rolling12MonthImprovement;

private:
    // used for calcs
    double yearToDateBaselineActualEnergyUse;
    double yearToDateModeledEnergyUse;
    double yearToDateActualEnergyUse;
    double yearToDateBaselineModeledEnergyUse;
    double yearToDateAdjustedEnergyUse;
    int summaryDataIndex;
    double baselineModeledEnergyUse;
    int monthIndex;

    void initializeYearToDateValues(std::vector<MonthlyAnalysisCalculatedValues> previousMonthValues);
    void setYearToDateBaselineActualEnergyUse(double baselineActualEnergyUse);
    void setYearToDateModeledEnergyUse();
    void setYearToDateActualEnergyUse();
    void setBaselineModeledEnergyUse(int baselineYear, std::vector<MonthlyAnalysisCalculatedValues> previousMonthValues);
    void setAdjustedForNormalization(double baselineActualEnergyUse);
    void setAdjusted(double baselineAdjustmentForOther);
    void setSEnPI();
    void setSavings();
    void setPercentSavingsComparedToBaseline();
    void setYearToDateSavings(int baselineYear);
    void setBaselineAdjustmentForNormalization(double baselineActualEnergyUse);
    void setBaselineAdjustment(double baselineAdjustmentForOther);
    void setRollingSavingsValues(std::vector<MonthlyAnalysisCalculatedValues> previousMonthValues, int baselineYear);
    void setYearToDatePercentSavings();
};

#endif // MONTHLYANALYSISCALCULATEDVALUES_H
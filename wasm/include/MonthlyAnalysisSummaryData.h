#include "MonthlyGroupAnalysis.h"
#include "AnalysisDate.h"
#include "MonthlyAnalysisCalculatedValues.h"
#include <iostream>
#ifndef MONTHLYANALYSISSUMMARYDATA_H
#define MONTHLYANALYSISSUMMARYDATA_H
class MonthlyAnalysisSummaryData
{

public:
    /**
     * @brief
     *
     *
     */
    MonthlyAnalysisSummaryData(){};

    MonthlyAnalysisSummaryData(
        MonthlyGroupAnalysis monthlyGroupAnalysis,
        AnalysisDate analysisMonth,
        std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData) : analysisMonth(analysisMonth), monthlyGroupAnalysis(monthlyGroupAnalysis)
    {
        setFiscalYear(monthlyGroupAnalysis.facility);
        setMonthPredictorData(monthlyGroupAnalysis.facilityPredictorData);
        setMonthMeterData(monthlyGroupAnalysis.groupMonthlyData);
        setEnergyUse();
        setMonthIndex(previousMonthsSummaryData);
        setBaselineActualEnergyUse(monthlyGroupAnalysis.baselineDate.year, previousMonthsSummaryData);
        setPredictorAndProductionUsage(monthlyGroupAnalysis.predictorVariables);
        setModeledEnergy(monthlyGroupAnalysis.selectedGroup.analysisType, monthlyGroupAnalysis.predictorVariables, monthlyGroupAnalysis.baselineEnergyIntensity);
        setAnnualEnergyUse(monthlyGroupAnalysis.annualMeterDataUsage);
        setBaselineAdjustmentForOther(monthlyGroupAnalysis.baselineDate.year);
        setMonthlyAnalysisCalculatedValues(monthlyGroupAnalysis.baselineDate.year, previousMonthsSummaryData);
    }

    MonthlyAnalysisSummaryData(
        AnalysisDate analysisMonth,
        double energyUse,
        double modeledEnergy,
        double baselineAdjustmentForOther,
        double fiscalYear,
        MonthlyAnalysisCalculatedValues monthlyAnalysisCalculatedValues,
        std::vector<PredictorUsage> predictorUsage) : analysisMonth(analysisMonth), energyUse(energyUse), modeledEnergy(modeledEnergy), baselineAdjustmentForOther(baselineAdjustmentForOther),
                                                      fiscalYear(fiscalYear), monthlyAnalysisCalculatedValues(monthlyAnalysisCalculatedValues), predictorUsage(predictorUsage){

                                                                                                                                                };

    MonthlyGroupAnalysis monthlyGroupAnalysis;
    AnalysisDate analysisMonth;
    double energyUse;
    double modeledEnergy;
    double baselineAdjustmentForOther;
    double fiscalYear;
    MonthlyAnalysisCalculatedValues monthlyAnalysisCalculatedValues;

    std::vector<PredictorEntry> monthPredictorData;
    std::vector<MonthlyData> monthMeterData;
    double baselineActualEnergyUse;
    int monthIndex;
    std::vector<PredictorUsage> predictorUsage;
    std::vector<double> productionUsage;
    double annualEnergyUse;

    void setFiscalYear(Facility facility);
    void setMonthPredictorData(std::vector<PredictorEntry> facilityPredictorData);
    void setMonthMeterData(std::vector<MonthlyData> allMonthlyData);
    void setEnergyUse();
    void setBaselineActualEnergyUse(int baselineYear, std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData);
    void setPredictorAndProductionUsage(std::vector<PredictorData> predictorVariables);
    void setMonthIndex(std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData);
    void setModeledEnergy(std::string analysisType, std::vector<PredictorData> predictorVariables, double baselineYearEnergyIntensity);
    double calculateRegressionModeledEnergy(std::vector<PredictorData> predictorVariables);
    double calculateEnergyIntensityModeledEnergy(double baselineYearEnergyIntensity);
    double calculateModifiedEnegyIntensityModeledEnergy(double baselineYearEnergyIntensity);
    void setAnnualEnergyUse(std::vector<AnnualUsage> annualUsage);
    void setBaselineAdjustmentForOther(int baselineYear);
    void setMonthlyAnalysisCalculatedValues(int baselineYear, std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData);
    double getTotalProductionUsage();
};

#endif // MONTHLYANALYSISSUMMARYDATA_H
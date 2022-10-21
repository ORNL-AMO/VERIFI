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
        // setMonthMeterData(monthlyGroupAnalysis.groupMonthlyData);
        // setMonthPredictorData(monthlyGroupAnalysis.facilityPredictorData);
        setEnergyUse(monthlyGroupAnalysis.groupMonthlyData);
        setMonthIndex(previousMonthsSummaryData);
        setBaselineActualEnergyUse(monthlyGroupAnalysis.baselineDate.year, previousMonthsSummaryData);
        setPredictorAndProductionUsage(monthlyGroupAnalysis.predictorVariables, monthlyGroupAnalysis.facilityPredictorData);
        setModeledEnergy(monthlyGroupAnalysis.selectedGroup.analysisType, monthlyGroupAnalysis.predictorVariables, monthlyGroupAnalysis.baselineEnergyIntensity, monthlyGroupAnalysis.facilityPredictorData);
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

    double baselineActualEnergyUse;
    int monthIndex;
    std::vector<PredictorUsage> predictorUsage;
    double totalProductionUsage;
    double annualEnergyUse;
    bool hasMonthlyData;
    void setFiscalYear(Facility facility);
    std::vector<PredictorEntry> getMonthPredictorData(std::vector<PredictorEntry> facilityPredictorData);
    std::vector<MonthlyData> getMonthMeterData(std::vector<MonthlyData> allMonthlyData);
    void setEnergyUse(std::vector<MonthlyData> allMonthlyData);
    void setBaselineActualEnergyUse(int baselineYear, std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData);
    void setPredictorAndProductionUsage(std::vector<PredictorData> predictorVariables, std::vector<PredictorEntry> facilityPredictorData);
    void setMonthIndex(std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData);
    void setModeledEnergy(std::string analysisType, std::vector<PredictorData> predictorVariables, double baselineYearEnergyIntensity, std::vector<PredictorEntry> facilityPredictorData);
    double calculateRegressionModeledEnergy(std::vector<PredictorData> predictorVariables, std::vector<PredictorEntry> facilityPredictorData);
    double calculateEnergyIntensityModeledEnergy(double baselineYearEnergyIntensity);
    double calculateModifiedEnegyIntensityModeledEnergy(double baselineYearEnergyIntensity);
    void setAnnualEnergyUse(std::vector<AnnualUsage> annualUsage);
    void setBaselineAdjustmentForOther(int baselineYear);
    void setMonthlyAnalysisCalculatedValues(int baselineYear, std::vector<MonthlyAnalysisSummaryData> previousMonthsSummaryData);
};

#endif // MONTHLYANALYSISSUMMARYDATA_H
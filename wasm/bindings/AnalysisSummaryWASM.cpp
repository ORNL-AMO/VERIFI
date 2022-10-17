

#include "MonthlyAnalysisSummary.h"
#include "AnnualAnalysisSummary.h"
#include "MonthlyFacilityAnalysis.h"
#include <emscripten/bind.h>
using namespace emscripten;

EMSCRIPTEN_BINDINGS(monthly_analysis_summary)
{
    register_vector<CalanderizedMeter>("CalanderizedMeterVector");
    register_vector<PredictorEntry>("PredictorEntryVector");
    register_vector<PredictorData>("PredictorDataVector");
    register_vector<BaselineAdjustments>("BaselineAdjustmentsVector");
    register_vector<MonthlyData>("MonthlyDataVector");
    register_vector<MonthlyAnalysisSummaryData>("MonthlyAnalysisSummaryDataVector");
    register_vector<PredictorUsage>("PredictorUsageVector");
    register_vector<AnnualAnalysisSummaryData>("AnnualAnalysisSummaryDataVector");
    register_vector<AnalysisGroup>("AnalysisGroupVector");
    register_vector<MonthlyFacilityAnalysisData>("MonthlyFacilityAnalysisDataVector");

    class_<MonthlyAnalysisSummary>("MonthlyAnalysisSummary")
        .constructor<AnalysisGroup, AnalysisDate, AnalysisDate, Facility, std::vector<CalanderizedMeter>, std::vector<PredictorEntry>>()
        .function("getMonthlyAnalysisSummaryData", &MonthlyAnalysisSummary::getMonthlyAnalysisSummaryData);

    class_<MonthlyAnalysisSummaryData>("MonthlyAnalysisSummaryData")
        .property("analysisMonth", &MonthlyAnalysisSummaryData::analysisMonth)
        .property("monthlyAnalysisCalculatedValues", &MonthlyAnalysisSummaryData::monthlyAnalysisCalculatedValues)
        .property("baselineAdjustmentForOther", &MonthlyAnalysisSummaryData::baselineAdjustmentForOther)
        .property("predictorUsage", &MonthlyAnalysisSummaryData::predictorUsage);

    class_<MonthlyAnalysisCalculatedValues>("MonthlyAnalysisCalculatedValues")
        .property("energyUse", &MonthlyAnalysisCalculatedValues::energyUse)
        .property("modeledEnergy", &MonthlyAnalysisCalculatedValues::modeledEnergy)
        .property("adjustedForNormalization", &MonthlyAnalysisCalculatedValues::adjustedForNormalization)
        .property("adjusted", &MonthlyAnalysisCalculatedValues::adjusted)
        .property("baselineAdjustmentForNormalization", &MonthlyAnalysisCalculatedValues::baselineAdjustmentForNormalization)
        .property("baselineAdjustment", &MonthlyAnalysisCalculatedValues::baselineAdjustment)
        .property("fiscalYear", &MonthlyAnalysisCalculatedValues::fiscalYear)
        .property("SEnPI", &MonthlyAnalysisCalculatedValues::SEnPI)
        .property("savings", &MonthlyAnalysisCalculatedValues::savings)
        .property("percentSavingsComparedToBaseline", &MonthlyAnalysisCalculatedValues::percentSavingsComparedToBaseline)
        .property("yearToDateSavings", &MonthlyAnalysisCalculatedValues::yearToDateSavings)
        .property("yearToDatePercentSavings", &MonthlyAnalysisCalculatedValues::yearToDatePercentSavings)
        .property("rollingSavings", &MonthlyAnalysisCalculatedValues::rollingSavings)
        .property("rolling12MonthImprovement", &MonthlyAnalysisCalculatedValues::rolling12MonthImprovement);

    class_<AnnualAnalysisSummary>("AnnualAnalysisSummary")
        .constructor<AnalysisGroup, AnalysisDate, AnalysisDate, Facility, std::vector<CalanderizedMeter>, std::vector<PredictorEntry>>()
        .constructor<std::vector<AnalysisGroup>, Facility, std::vector<CalanderizedMeter>, std::vector<PredictorEntry>, AnalysisDate, AnalysisDate, bool>()
        .function("getAnnualAnalysisSummaryData", &AnnualAnalysisSummary::getAnnualAnalysisSummaryData)
        .function("getAnnualFacilitySummaryData", &AnnualAnalysisSummary::getAnnualFacilitySummaryData);

    class_<AnnualAnalysisSummaryData>("AnnualAnalysisSummaryData")
        .property("year", &AnnualAnalysisSummaryData::year)
        .property("energyUse", &AnnualAnalysisSummaryData::energyUse)
        .property("modeledEnergy", &AnnualAnalysisSummaryData::modeledEnergy)
        .property("adjustedForNormalization", &AnnualAnalysisSummaryData::adjustedForNormalization)
        .property("adjusted", &AnnualAnalysisSummaryData::adjusted)
        .property("baselineAdjustmentForNormalization", &AnnualAnalysisSummaryData::baselineAdjustmentForNormalization)
        .property("baselineAdjustmentForOther", &AnnualAnalysisSummaryData::baselineAdjustmentForOther)
        .property("baselineAdjustment", &AnnualAnalysisSummaryData::baselineAdjustment)
        .property("SEnPI", &AnnualAnalysisSummaryData::SEnPI)
        .property("savings", &AnnualAnalysisSummaryData::savings)
        .property("totalSavingsPercentImprovement", &AnnualAnalysisSummaryData::totalSavingsPercentImprovement)
        .property("annualSavingsPercentImprovement", &AnnualAnalysisSummaryData::annualSavingsPercentImprovement)
        .property("cummulativeSavings", &AnnualAnalysisSummaryData::cummulativeSavings)
        .property("newSavings", &AnnualAnalysisSummaryData::newSavings)
        .property("predictorUsage", &AnnualAnalysisSummaryData::predictorUsage);

    class_<MonthlyFacilityAnalysis>("MonthlyFacilityAnalysis")
        .constructor<std::vector<AnalysisGroup>, Facility, std::vector<CalanderizedMeter>, std::vector<PredictorEntry>, AnalysisDate, AnalysisDate>()
        .function("getMonthlyFacilityAnalysisData", &MonthlyFacilityAnalysis::getMonthlyFacilityAnalysisData);

    class_<MonthlyFacilityAnalysisData>("MonthlyFacilityAnalysisData")
        .property("analysisMonth", &MonthlyFacilityAnalysisData::analysisMonth)
        .property("energyUse", &MonthlyFacilityAnalysisData::energyUse)
        .property("modeledEnergy", &MonthlyFacilityAnalysisData::modeledEnergy)
        .property("baselineActualEnergyUse", &MonthlyFacilityAnalysisData::baselineActualEnergyUse)
        .property("baselineAdjustmentForOther", &MonthlyFacilityAnalysisData::baselineAdjustmentForOther)
        .property("predictorUsage", &MonthlyFacilityAnalysisData::predictorUsage)
        .property("fiscalYear", &MonthlyFacilityAnalysisData::fiscalYear)
        .property("monthlyAnalysisCalculatedValues", &MonthlyFacilityAnalysisData::monthlyAnalysisCalculatedValues);

    class_<AnalysisDate>("AnalysisDate")
        .property("year", &AnalysisDate::year)
        .property("month", &AnalysisDate::month)
        .constructor<int, int>();

    class_<AnalysisGroup>("AnalysisGroup")
        .constructor<std::string, std::vector<PredictorData>, std::string, double, double, bool, std::vector<BaselineAdjustments>, std::string>();

    class_<Facility>("Facility")
        .constructor<std::string, std::string, bool, int>();

    class_<CalanderizedMeter>("CalanderizedMeter")
        .constructor<Meter, std::vector<MonthlyData>>();

    class_<Meter>("Meter")
        .constructor<std::string>();

    class_<MonthlyData>("MonthlyData")
        .constructor<int, int, double>();

    class_<PredictorData>("PredictorData")
        .constructor<bool, double, std::string, double>();

    class_<PredictorEntry>("PredictorEntry")
        .constructor<std::string, std::vector<PredictorData>, AnalysisDate>();

    class_<BaselineAdjustments>("BaselineAdjustments")
        .constructor<int, int>();

    class_<PredictorUsage>("PredictorUsage")
        .property("usage", &PredictorUsage::usage)
        .property("predictorId", &PredictorUsage::predictorId);
}

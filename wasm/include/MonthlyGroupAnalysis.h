#include "AnalysisGroup.h"
#include "Facility.h"
#include "CalanderizedMeter.h"
#include "MonthlyData.h"
#include "PredictorEntry.h"
#include "Helper.h"
#include <vector>
#include "AnalysisDate.h"

#ifndef MONTHLYGROUPANALYSIS_H
#define MONTHLYGROUPANALYSIS_H

class MonthlyGroupAnalysis
{
public:
    /**
     * @brief
     *
     */
    MonthlyGroupAnalysis(){};

    MonthlyGroupAnalysis(
        AnalysisGroup selectedGroup,
        Facility facility,
        std::vector<CalanderizedMeter> calanderizedMeters,
        std::vector<PredictorEntry> accountPredictorEntries,
        AnalysisDate baselineDate,
        AnalysisDate endDate) : selectedGroup(selectedGroup),
                                facility(facility),
                                baselineDate(baselineDate),
                                endDate(endDate)
    {
        setPredictorVariables();
        setFacilityPredictorData(accountPredictorEntries);
        setGroupMeters(calanderizedMeters);
        setGroupMonthlyData();
        setAnnualMeterDataUsage();
        setBaselineYearEnergyIntensity();
        getYearPredictorUsage();
    };

    AnalysisGroup selectedGroup;
    Facility facility;
    std::vector<PredictorEntry> facilityPredictorData;
    AnalysisDate baselineDate;
    AnalysisDate endDate;
    std::vector<PredictorData> predictorVariables;
    std::vector<CalanderizedMeter> groupMeters;
    std::vector<MonthlyData> groupMonthlyData;
    std::vector<AnnualUsage> annualMeterDataUsage;
    double baselineEnergyIntensity;

    void setPredictorVariables();
    void setFacilityPredictorData(std::vector<PredictorEntry> accountPredictorEntries);
    void setGroupMeters(std::vector<CalanderizedMeter> calanderizedMeters);
    void setGroupMonthlyData();
    void setAnnualMeterDataUsage();
    void setBaselineYearEnergyIntensity();
    double getYearPredictorUsage();
};

#endif // MONTHLYGROUPANALYSIS_H
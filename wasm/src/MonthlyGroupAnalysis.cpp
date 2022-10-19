#include "MonthlyGroupAnalysis.h"
#include <iostream>
void MonthlyGroupAnalysis::setPredictorVariables()
{
    for (int i = 0; i < selectedGroup.predictorVariables.size(); i++)
    {
        if (selectedGroup.analysisType == "absoluteEnergyConsumption")
        {
            selectedGroup.predictorVariables[i].productionInAnalysis = false;
        }
        if (selectedGroup.predictorVariables[i].productionInAnalysis == true)
        {
            predictorVariables.push_back(selectedGroup.predictorVariables[i]);
        }
    }
};
void MonthlyGroupAnalysis::setFacilityPredictorData(std::vector<PredictorEntry> accountPredictorEntries)
{
    for (int i = 0; i < accountPredictorEntries.size(); i++)
    {
        if (accountPredictorEntries[i].facilityId == facility.guid)
        {
            facilityPredictorData.push_back(accountPredictorEntries[i]);
        }
    }
};
void MonthlyGroupAnalysis::setGroupMeters(std::vector<CalanderizedMeter> calanderizedMeters)
{
    for (int i = 0; i < calanderizedMeters.size(); i++)
    {
        if (calanderizedMeters[i].meter.groupId == selectedGroup.idbGroupId)
        {
            groupMeters.push_back(calanderizedMeters[i]);
        }
    }
};
void MonthlyGroupAnalysis::setGroupMonthlyData()
{
    for (int i = 0; i < groupMeters.size(); i++)
    {
        for (int x = 0; x < groupMeters[i].monthlyData.size(); x++)
        {
            groupMonthlyData.push_back(groupMeters[i].monthlyData[x]);
        }
    }
};

void MonthlyGroupAnalysis::setAnnualMeterDataUsage()
{
    for (int year = baselineDate.year; year <= endDate.year; year++)
    {
        double totalUsage = 0;
        for (int i = 0; i < groupMonthlyData.size(); i++)
        {
            if (groupMonthlyData[i].year == year)
            {
                totalUsage += groupMonthlyData[i].energyUse;
            }
        }
        AnnualUsage yearUsage = AnnualUsage(year, totalUsage);
        annualMeterDataUsage.push_back(yearUsage);
    }
};

void MonthlyGroupAnalysis::setBaselineYearEnergyIntensity()
{
    if (selectedGroup.analysisType == "energyIntensity" || selectedGroup.analysisType == "modifiedEnergyIntensity")
    {
        double predictorUsage = getYearPredictorUsage(baselineDate.year);
        double baselineYearEnergyUse = 0;
        for (int i = 0; i < annualMeterDataUsage.size(); i++)
        {
            if (annualMeterDataUsage[i].year == baselineDate.year)
            {
                baselineYearEnergyUse = annualMeterDataUsage[i].usage;
                i = annualMeterDataUsage.size();
            }
        };
        baselineEnergyIntensity = (baselineYearEnergyUse / predictorUsage);
    }
    else
    {
        baselineEnergyIntensity = 0;
    }
};

double MonthlyGroupAnalysis::getYearPredictorUsage(int year)
{
    double totalPredictorUsage = 0;
    for (int i = 0; i < predictorVariables.size(); i++)
    {
        for (int x = 0; x < facilityPredictorData.size(); x++)
        {
            if (facilityPredictorData[x].date.year == year)
            {
                for (int p = 0; p < facilityPredictorData[x].predictors.size(); p++)
                {
                    if (predictorVariables[i].id == facilityPredictorData[x].predictors[p].id)
                    {
                        totalPredictorUsage += facilityPredictorData[x].predictors[p].amount;
                    }
                }
            }
        }
    }

    return totalPredictorUsage;
}
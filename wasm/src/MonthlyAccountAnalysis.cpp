#include "MonthlyAccountAnalysis.h"

void MonthlyAccountAnalysis::setFacilityAnalysisItems(std::vector<Facility> facilities, std::vector<AnalysisGroup> allAccountGroups, std::vector<CalanderizedMeter> calanderizedMeters, std::vector<PredictorEntry> accountPredictorEntries)
{
    for (int i = 0; i < facilities.size(); i++)
    {
        std::vector<AnalysisGroup> facilityGroups;
        for (int x = 0; x < allAccountGroups.size(); x++)
        {
            if (allAccountGroups[x].facilityId == facilities[i].guid)
            {
                facilityGroups.push_back(allAccountGroups[x]);
            }
        }
        MonthlyFacilityAnalysis monthlyFacilityAnalysis = MonthlyFacilityAnalysis(facilityGroups, facilities[i], calanderizedMeters,
                                                                                  accountPredictorEntries, baselineDate, endDate);
        facilityAnalysisItems.push_back(monthlyFacilityAnalysis);
    }
};
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '../models/idbModels/accountReport';

export function removeFacilityFromAccountReport<T extends IdbAccountReport>(
  report: T,
  facilityGuid: string,
  modifiedDate: Date
): T {
  let updatedReport = {
    ...report,
    modifiedDate
  } as T;

  if (report.dataOverviewReportSetup) {
    const includedFacilities = report.dataOverviewReportSetup.includedFacilities;
    updatedReport = {
      ...updatedReport,
      dataOverviewReportSetup: {
        ...report.dataOverviewReportSetup,
        ...(Array.isArray(includedFacilities) ? {
          includedFacilities: includedFacilities.filter(facility => facility.facilityId !== facilityGuid)
        } : {})
      }
    };
  }

  if (report.betterClimateReportSetup) {
    const includedFacilityGroups = report.betterClimateReportSetup.includedFacilityGroups;
    updatedReport = {
      ...updatedReport,
      betterClimateReportSetup: {
        ...report.betterClimateReportSetup,
        ...(Array.isArray(includedFacilityGroups) ? {
          includedFacilityGroups: includedFacilityGroups
            .filter(facility => facility.facilityId !== facilityGuid)
        } : {})
      }
    };
  }

  return updatedReport;
}

export function removeFacilityFromAccountAnalysis<T extends IdbAccountAnalysisItem>(
  analysisItem: T,
  facilityGuid: string,
  modifiedDate: Date
): T {
  return {
    ...analysisItem,
    modifiedDate,
    ...(Array.isArray(analysisItem.facilityAnalysisItems) ? {
      facilityAnalysisItems: analysisItem.facilityAnalysisItems
        .filter(facilityItem => facilityItem.facilityId !== facilityGuid)
    } : {})
  } as T;
}

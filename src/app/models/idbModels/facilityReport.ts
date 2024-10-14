import { getNewIdbEntry, IdbEntry } from "./idbEntry";


export interface IdbFacilityReport extends IdbEntry {
    facilityId: string,
    accountId: string,
    name: string,
    facilityReportType: FacilityReportType,
    analysisItemId: string,
}

export function getNewIdbFacilityReport(facilityId: string, accountId: string, reportType: FacilityReportType): IdbFacilityReport {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        facilityReportType: reportType,
        analysisItemId: undefined,
        name: 'New Report'
    }
}

export type FacilityReportType = 'analysis';
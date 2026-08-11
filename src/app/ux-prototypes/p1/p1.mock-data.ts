export interface PrototypeWorkspaceSummary {
  companyName: string;
  facilityName: string;
  reportingYear: number;
  facilityCount: number;
  meterCount: number;
  analysisCount: number;
}

export const p1WorkspaceSummary: PrototypeWorkspaceSummary = {
  companyName: 'Example Manufacturing Group',
  facilityName: 'North Plant',
  reportingYear: 2026,
  facilityCount: 1,
  meterCount: 8,
  analysisCount: 3
};

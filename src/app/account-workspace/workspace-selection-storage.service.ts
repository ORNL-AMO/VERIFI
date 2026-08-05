import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

export interface WorkspaceSelectionHints {
  readonly accountId?: number;
  readonly facilityId?: number;
  readonly facilityAnalysisId?: number;
  readonly accountAnalysisId?: number;
  readonly accountReportId?: number;
  readonly facilityReportId?: number;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceSelectionStorageService {
  constructor(private localStorage: LocalStorageService) { }

  read(): WorkspaceSelectionHints {
    return {
      accountId: normalizeStoredId(this.localStorage.retrieve('accountId')),
      facilityId: normalizeStoredId(this.localStorage.retrieve('facilityId')),
      facilityAnalysisId: normalizeStoredId(this.localStorage.retrieve('analysisItemId')),
      accountAnalysisId: normalizeStoredId(this.localStorage.retrieve('accountAnalysisItemsId')),
      accountReportId: normalizeStoredId(this.localStorage.retrieve('accountReportId')),
      facilityReportId: normalizeStoredId(this.localStorage.retrieve('facilityReportId'))
    };
  }

  storeAccount(id: number): void {
    this.localStorage.store('accountId', id);
  }

  clearAccount(): void {
    this.localStorage.clear('accountId');
  }

  storeFacility(id: number): void {
    this.localStorage.store('facilityId', id);
  }

  clearFacility(): void {
    this.localStorage.clear('facilityId');
  }

  storeFacilityAnalysis(id: number): void {
    this.localStorage.store('analysisItemId', id);
  }

  storeAccountAnalysis(id: number): void {
    this.localStorage.store('accountAnalysisItemsId', id);
  }

  storeAccountReport(id: number): void {
    this.localStorage.store('accountReportId', id);
  }

  storeFacilityReport(id: number): void {
    this.localStorage.store('facilityReportId', id);
  }
}

function normalizeStoredId(storedId: unknown): number | undefined {
  const value = typeof storedId === 'number'
    ? storedId
    : typeof storedId === 'string' && storedId.trim() !== ''
      ? Number(storedId)
      : Number.NaN;
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

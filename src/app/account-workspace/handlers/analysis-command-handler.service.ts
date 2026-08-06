/**
 * Persistence-only handler for facility-analysis and account-analysis commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountAnalysisDbService } from '../../indexedDB/account-analysis-db.service';
import { AnalysisDbService } from '../../indexedDB/analysis-db.service';
import { IdbAccountAnalysisItem } from '../../models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '../../models/idbModels/analysisItem';
import { WorkspaceWriteError } from '../workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class AnalysisCommandHandler {
  constructor(
    private readonly analysisDb: AnalysisDbService,
    private readonly accountAnalysisDb: AccountAnalysisDbService
  ) { }

  // ---------------------------------------------------------------------------
  // Facility analysis
  // ---------------------------------------------------------------------------

  async addFacilityAnalysis(analysis: IdbAnalysisItem): Promise<IdbAnalysisItem> {
    return firstValueFrom(this.analysisDb.addWithObservable({ ...analysis }));
  }

  async updateFacilityAnalysis(analysis: IdbAnalysisItem, activeAccountGuid: string): Promise<IdbAnalysisItem> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'facility analysis');
    return firstValueFrom(this.analysisDb.updateWithObservable({ ...analysis }));
  }

  async deleteFacilityAnalysis(analysis: IdbAnalysisItem, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'facility analysis');
    await firstValueFrom(this.analysisDb.deleteWithObservable(analysis.id));
    return analysis.id;
  }

  // ---------------------------------------------------------------------------
  // Account analysis
  // ---------------------------------------------------------------------------

  async addAccountAnalysis(analysis: IdbAccountAnalysisItem): Promise<IdbAccountAnalysisItem> {
    return firstValueFrom(this.accountAnalysisDb.addWithObservable({ ...analysis }));
  }

  async updateAccountAnalysis(analysis: IdbAccountAnalysisItem, activeAccountGuid: string): Promise<IdbAccountAnalysisItem> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'account analysis');
    return firstValueFrom(this.accountAnalysisDb.updateWithObservable({ ...analysis }));
  }

  async deleteAccountAnalysis(analysis: IdbAccountAnalysisItem, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(analysis.accountId, activeAccountGuid, 'account analysis');
    await firstValueFrom(this.accountAnalysisDb.deleteWithObservable(analysis.id));
    return analysis.id;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertOwnership(entityAccountGuid: string | undefined, activeAccountGuid: string, label: string): void {
    if (entityAccountGuid && entityAccountGuid !== activeAccountGuid) {
      throw new WorkspaceWriteError(
        'cross-account-entity',
        `${label} belongs to account ${entityAccountGuid}, not the active account ${activeAccountGuid}.`
      );
    }
  }
}

import { Injectable, inject } from '@angular/core';
import { AnalysisReportUsageCommand, AnalysisUsageCommand } from './analysis-usage.models';
import { AnalysisUsageCommandHandler, AnalysisUsageWriteResult } from './handlers/analysis-usage-command-handler.service';
import { WorkspaceCommandBoundary } from './workspace-command-boundary.service';
import { AccountWorkspaceStore } from './account-workspace.store';
import { WorkspaceEntityKind, WorkspaceWriteError } from './workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class AnalysisUsageCommands {
  private readonly handler = inject(AnalysisUsageCommandHandler);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly workspace = inject(AccountWorkspaceStore);

  saveReport(command: AnalysisReportUsageCommand): Promise<AnalysisUsageWriteResult> {
    return this.execute(command, command.report.scope === 'account' ? 'accountReport' : 'facilityReport',
      () => this.handler.saveReport(command));
  }
  saveAccountAnalysis(command: AnalysisUsageCommand): Promise<AnalysisUsageWriteResult> {
    return this.execute(command, 'accountAnalysis', () => this.handler.saveAccountAnalysis(command));
  }
  private async execute(command: AnalysisUsageCommand, entityKind: WorkspaceEntityKind,
    persist: () => Promise<AnalysisUsageWriteResult>): Promise<AnalysisUsageWriteResult> {
    const accountGuid = command.source.accountGuid;
    const requireContext = () => {
      if (this.workspace.account()?.guid !== accountGuid || !this.workspace.canWrite()) {
        throw new WorkspaceWriteError('stale-workspace', 'The analysis workspace changed. Reopen the action and try again.');
      }
    };
    requireContext();
    const result = await this.boundary.execute({ entityKind,
      changeKind: 'add', entityGuid: command.target.guid,
      label: 'Creating linked item', notification: { successTitle: 'Linked item created' },
      publication: { mode: 'patch', buildPatch: value => ({ collections: [
        { collection: 'accountAnalyses', upsert: value.accountAnalyses },
        { collection: 'accountReports', upsert: value.accountReports },
        { collection: 'facilityReports', upsert: value.facilityReports }
      ] }) }
    }, () => { requireContext(); return persist(); });
    return result.value;
  }
}

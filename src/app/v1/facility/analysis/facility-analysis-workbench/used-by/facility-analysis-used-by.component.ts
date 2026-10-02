import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';

@Component({ selector: 'app-facility-analysis-used-by', standalone: true, imports: [RouterLink, IconComponent], templateUrl: './facility-analysis-used-by.component.html', styleUrls: ['./facility-analysis-used-by.component.css'] })
export class FacilityAnalysisUsedByComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly analysis = this.context.analysis;
  readonly dependencies = computed(() => {
    const analysis = this.analysis();
    return analysis ? buildFacilityAnalysisDependencies(
      analysis, this.context.analyses(), this.context.workspace.accountAnalyses(), this.context.workspace.selectedFacilityReports()
    ) : { linkedAccountAnalyses: [], linkedReports: [], bankingSource: undefined, bankingConsumers: [] };
  });
  readonly linkedAccountAnalyses = computed(() => this.dependencies().linkedAccountAnalyses);
  readonly linkedReports = computed(() => this.dependencies().linkedReports);
  readonly bankingSource = computed(() => this.dependencies().bankingSource);
  readonly bankingConsumers = computed(() => this.dependencies().bankingConsumers);
  readonly totalDependencies = computed(() => this.linkedAccountAnalyses().length + this.linkedReports().length + this.bankingConsumers().length + (this.bankingSource() ? 1 : 0));
}

export function buildFacilityAnalysisDependencies(
  analysis: IdbAnalysisItem,
  analyses: readonly IdbAnalysisItem[],
  accountAnalyses: readonly IdbAccountAnalysisItem[],
  reports: readonly IdbFacilityReport[]
) {
  return {
    linkedAccountAnalyses: accountAnalyses.filter(item => item.facilityAnalysisItems?.some(link =>
      link.facilityId === analysis.facilityId && link.analysisItemId === analysis.guid)),
    linkedReports: reports.filter(report => report.analysisItemId === analysis.guid),
    bankingSource: analysis.bankedAnalysisItemId
      ? analyses.find(item => item.guid === analysis.bankedAnalysisItemId)
      : undefined,
    bankingConsumers: analyses.filter(item => item.bankedAnalysisItemId === analysis.guid)
  };
}

import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';
import { AnalysisGroupItem, AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';

@Component({
  selector: 'app-analysis-status-check',
  standalone: false,
  templateUrl: './analysis-status-check.component.html',
  styleUrl: './analysis-status-check.component.css'
})
export class AnalysisStatusCheckComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input({ required: true }) analysisStatusCheck: AnalysisStatusCheck;
  @Input({ required: true }) type: 'energy' | 'water';

  private analysisService = inject(AnalysisService);
  private router = inject(Router);

  get groupItems(): Array<AnalysisGroupItem> {
    if (!this.analysisStatusCheck?.analysisItem?.groups) return [];
    return this.analysisStatusCheck.analysisItem.groups
      .map(g => this.analysisService.getGroupItem(g))
      .filter(gi => gi.group.analysisType !== 'skip' && gi.group.analysisType !== 'skipAnalysis');
  }

  goToAnalysis(): void {
    this.accountWorkspaceService.selectFacilityAnalysis((this.analysisStatusCheck.analysisItem)?.guid);
    const facilityGuid = this.accountWorkspaceStore.selectedFacility().guid;
    this.router.navigateByUrl(`/data-evaluation/facility/${facilityGuid}/analysis/run-analysis/analysis-setup`);
  }
}

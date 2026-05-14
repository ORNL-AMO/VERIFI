import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroupItem, AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';

@Component({
  selector: 'app-analysis-status-check',
  standalone: false,
  templateUrl: './analysis-status-check.component.html',
  styleUrl: './analysis-status-check.component.css'
})
export class AnalysisStatusCheckComponent {
  @Input({ required: true }) analysisStatusCheck: AnalysisStatusCheck;
  @Input({ required: true }) type: 'energy' | 'water';

  private analysisService = inject(AnalysisService);
  private analysisDbService = inject(AnalysisDbService);
  private facilityDbService = inject(FacilitydbService);
  private router = inject(Router);

  get groupItems(): Array<AnalysisGroupItem> {
    if (!this.analysisStatusCheck?.analysisItem?.groups) return [];
    return this.analysisStatusCheck.analysisItem.groups
      .map(g => this.analysisService.getGroupItem(g))
      .filter(gi => gi.group.analysisType !== 'skip' && gi.group.analysisType !== 'skipAnalysis');
  }

  goToAnalysis(): void {
    this.analysisDbService.selectedAnalysisItem.next(this.analysisStatusCheck.analysisItem);
    const facilityGuid = this.facilityDbService.selectedFacility.getValue().guid;
    this.router.navigateByUrl(`/data-evaluation/facility/${facilityGuid}/analysis/run-analysis/analysis-setup`);
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { P1FacilityAnalysisRow, getP1AnalysisCategoryLabel } from '../facility-analysis-workbench.helpers';

@Component({
  selector: 'app-p1-facility-analysis-compare-drawer',
  templateUrl: './analysis-compare-drawer.component.html',
  styleUrls: ['../facility-analysis-page.component.css', './analysis-compare-drawer.component.css'],
  standalone: false
})
export class P1FacilityAnalysisCompareDrawerComponent {
  @Input({ required: true }) rows: P1FacilityAnalysisRow[] = [];
  @Input({ required: true }) compareRows: P1FacilityAnalysisRow[] = [];

  @Output() closeCompare = new EventEmitter<void>();
  @Output() clearCompare = new EventEmitter<void>();
  @Output() selectAnalysis = new EventEmitter<IdbAnalysisItem>();

  readonly categoryLabel = getP1AnalysisCategoryLabel;

  get availableRows(): P1FacilityAnalysisRow[] {
    const selectedGuids = new Set(this.compareRows.map(row => row.analysis.guid));
    return this.rows.filter(row => !selectedGuids.has(row.analysis.guid));
  }

  addAnalysis(analysisGuid: string): void {
    const row = this.rows.find(item => item.analysis.guid === analysisGuid);
    if (row) {
      this.selectAnalysis.emit(row.analysis);
    }
  }
}

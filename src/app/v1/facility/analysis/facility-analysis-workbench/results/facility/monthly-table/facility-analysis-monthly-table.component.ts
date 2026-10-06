import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { AnalysisResultStatusComponent } from '../../presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../presentation/toolbar/analysis-result-toolbar.component';

@Component({
  selector: 'app-facility-analysis-monthly-table',
  standalone: true,
  imports: [CommonModule, AnalysisResultStatusComponent, AnalysisResultToolbarComponent],
  templateUrl: './facility-analysis-monthly-table.component.html',
  styleUrls: ['./facility-analysis-monthly-table.component.css']
})
export class FacilityAnalysisMonthlyTableComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.monthly : [];
  });
  readonly hasMissingValues = computed(() => this.rows().some(row => row.missingValueWarning));
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? this.context.analysis()?.waterUnit
    : this.context.analysis()?.energyUnit);
}

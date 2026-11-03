import { Component, computed, inject } from '@angular/core';
import { facilityGroupContributionsView } from '@app/v1/shared/analysis-results/group-contributions/group-contributions.view';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { analysisReportSections } from '../analysis-report.view';
import { settingsDraft } from '../analysis-report-settings';

@Component({ selector: 'app-analysis-report-preview', standalone: false, templateUrl: './analysis-report-preview.component.html', styleUrls: ['./analysis-report-preview.component.css'] })
export class AnalysisReportPreviewComponent {
  readonly report = inject(FacilityAnalysisReportService);
  readonly context = this.report.context;
  readonly settings = computed(() => settingsDraft(this.context.report()?.analysisReportSettings));
  readonly value = computed(() => this.report.state().state === 'ready' ? this.report.state().value : undefined);
  readonly results = computed(() => this.value()?.results);
  readonly analysis = computed(() => this.context.workspace.facilityAnalyses().find(item => item.guid === this.context.report()?.analysisItemId && item.facilityId === this.context.facility()?.guid));
  readonly facility = this.context.facility;
  readonly unit = computed(() => this.analysis()?.analysisCategory === 'water' ? this.analysis()?.waterUnit ?? '' : this.analysis()?.energyUnit ?? '');
  readonly groupContributions = computed(() => {
    const results = this.results(), analysis = this.analysis();
    const reportYear = results?.reportYear ?? this.settings().reportYear;
    const annual = results && analysis && reportYear != null && reportYear > analysis.baselineYear
      ? results.annualAnalysisSummaries.filter(row => row.year <= reportYear) : [];
    return facilityGroupContributionsView(annual, results?.groupSummaries ?? [], new Map(Object.entries(this.report.groupNames())));
  });
  readonly sections = computed(() => {
    const analysis = this.analysis(), results = this.results();
    return analysis && results ? analysisReportSections(this.settings(), analysis, results, this.value()?.checks ?? [], this.report.groupNames()) : [];
  });
}

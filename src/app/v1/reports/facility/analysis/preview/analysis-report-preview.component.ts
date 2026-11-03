import { Component, computed, inject } from '@angular/core';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { settingsDraft } from '../analysis-report-settings';
import { buildFacilityAnalysisDocument } from '../analysis-report-document';

@Component({ selector: 'app-analysis-report-preview', standalone: false, templateUrl: './analysis-report-preview.component.html', styleUrls: ['./analysis-report-preview.component.css'] })
export class AnalysisReportPreviewComponent {
  readonly report = inject(FacilityAnalysisReportService);
  readonly context = this.report.context;
  readonly value = computed(() => this.report.state().state === 'ready' ? this.report.state().value : undefined);
  readonly results = computed(() => this.value()?.results);
  readonly analysis = computed(() => this.context.workspace.facilityAnalyses().find(item => item.guid === this.context.report()?.analysisItemId && item.facilityId === this.context.facility()?.guid));
  readonly facility = this.context.facility;
  readonly document = computed(() => {
    const report = this.context.report(), analysis = this.analysis(), facility = this.facility(), results = this.results();
    return report && analysis && facility && results
      ? buildFacilityAnalysisDocument(report, analysis, facility, results, this.value()?.checks ?? [], this.report.groupNames()) : undefined;
  });
  readonly settings = computed(() => this.document()?.settings ?? settingsDraft(this.context.report()?.analysisReportSettings));
  readonly unit = computed(() => this.document()?.unit ?? '');
  readonly groupContributions = computed(() => this.document()?.contributions ?? { groups: [], years: [] });
  readonly sections = computed(() => this.document()?.sections ?? []);
}

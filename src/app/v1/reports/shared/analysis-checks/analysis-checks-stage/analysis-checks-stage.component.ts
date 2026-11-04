import { Component, input, output } from '@angular/core';
import { AnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { StatusItem } from '@app/v1/status/status.models';
import { ReportResultState } from '../../calculation/report-result-state';

@Component({ selector: 'app-report-analysis-checks-stage', standalone: false,
  templateUrl: './analysis-checks-stage.component.html', styleUrls: ['./analysis-checks-stage.component.css'] })
export class ReportAnalysisChecksStageComponent {
  readonly state = input.required<ReportResultState<{ readonly checks?: readonly AnalysisDataChecks[] }>>();
  readonly findings = input<readonly StatusItem[]>([]);
  readonly groupNames = input<Readonly<Record<string, string>>>({});
  readonly facilityNames = input<Readonly<Record<string, string>>>({});
  readonly setupRoute = input.required<readonly string[]>();
  readonly retryRequested = output<void>();
}

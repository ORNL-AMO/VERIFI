import { FocusMonitor } from '@angular/cdk/a11y';
import { Component, ElementRef, Injector, ViewChild, afterNextRender, computed, inject } from '@angular/core';
import {
  PredictorDataQualityReport,
  buildPredictorDataQualityReport
} from '@domain/calculations/data-quality/predictor-data-quality';
import { PredictorQualityModule } from '@app/v1/shared/data-quality/predictor-quality.module';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { StatusItem } from '@app/v1/status/status.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { PREDICTOR_QUALITY_CONTEXT } from '../../predictor-quality-context';

interface PredictorQualityFindingView {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly severity: 'error' | 'warning';
  readonly settingsAction: boolean;
  readonly item?: StatusItem;
}

const QUALITY_FINDING_CODES = new Set([
  'predictor.data.duplicate-month',
  'predictor.data.gap',
  'predictor.data.negative',
  'predictor.weather.warning',
  'predictor.quality.outlier'
]);

@Component({
  selector: 'app-predictor-workbench-quality-report',
  templateUrl: './predictor-workbench-quality-report.component.html',
  styleUrls: ['./predictor-workbench-quality-report.component.css'],
  standalone: true,
  imports: [PredictorQualityModule, IconComponent]
})
export class PredictorWorkbenchQualityReportComponent {
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);
  readonly status = inject(WorkspaceStatusService);
  readonly context = inject(PREDICTOR_QUALITY_CONTEXT);
  readonly predictor = this.context.predictor;
  readonly readings = this.context.readings;
  readonly ids = computed(() => ({
    findings: `${this.context.idPrefix()}-findings-heading`,
    months: `${this.context.idPrefix()}-months-heading`,
    negative: `${this.context.idPrefix()}-negative-heading`,
    weather: `${this.context.idPrefix()}-weather-heading`
  }));

  @ViewChild('qualityRegion', { read: ElementRef }) private readonly qualityRegion?: ElementRef<HTMLElement>;

  readonly report = computed<PredictorDataQualityReport | undefined>(() => {
    const predictor = this.predictor();
    return predictor
      ? buildPredictorDataQualityReport(this.readings(), predictor)
      : undefined;
  });
  readonly findings = computed<readonly PredictorQualityFindingView[]>(() => {
    const report = this.report();
    const predictor = this.predictor();
    if (!report || !predictor) return [];
    if (this.status.state() === 'ready') {
      return this.context.findings()
        .filter(finding => QUALITY_FINDING_CODES.has(finding.code)
          && (this.context.expectedRangeEnabled() || finding.code !== 'predictor.quality.outlier'))
        .map(toFindingView);
    }
    return localFindings(report, this.context.expectedRangeEnabled());
  });
  readonly chartFileName = computed(() => `${slugify(this.predictor()?.name || 'predictor')}-data-quality-readings`);

  openReadings(): void {
    this.context.openReadings();
  }

  openSettings(): void {
    this.context.openSettings();
  }

  async discardWarning(item: StatusItem): Promise<void> {
    if (await this.status.discardWarning(item)) {
      afterNextRender(() => {
        if (this.qualityRegion) {
          this.focusMonitor.focusVia(this.qualityRegion, 'program');
        }
      }, { injector: this.injector });
    }
  }

}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'predictor';
}

function toFindingView(finding: StatusItem): PredictorQualityFindingView {
  return {
    id: finding.id,
    code: finding.code,
    title: finding.title,
    description: finding.description,
    severity: finding.severity === 'error' ? 'error' : 'warning',
    settingsAction: finding.code === 'predictor.data.negative',
    item: finding
  };
}

function localFindings(report: PredictorDataQualityReport, expectedRangeEnabled: boolean): PredictorQualityFindingView[] {
  const findings: PredictorQualityFindingView[] = [];
  if (report.duplicateMonths.length > 0) {
    findings.push(localFinding(
      'predictor.data.duplicate-month',
      'Resolve duplicate predictor data',
      `${report.duplicateMonths.length} month(s) contain duplicate entries.`,
      'error'
    ));
  }
  if (report.missingMonths.length > 0) {
    findings.push(localFinding(
      'predictor.data.gap',
      'Fill missing predictor data',
      `${report.missingMonths.length} month(s) are missing between the first and last entry.`,
      'error'
    ));
  }
  if (!report.predictor.canBeNegative && report.negativeMonths.length > 0) {
    findings.push(localFinding(
      'predictor.data.negative',
      'Review negative predictor data',
      `${report.negativeMonths.length} month(s) contain negative values that are not allowed.`,
      'error',
      true
    ));
  }
  if (report.predictor.predictorType === 'Weather'
    && !report.predictor.ignoreWeatherDataWarning
    && (report.weatherWarningMonths.length > 0 || report.weatherChangedMonths.length > 0)) {
    findings.push(localFinding(
      'predictor.weather.warning',
      'Review weather data',
      'Some weather entries contain incomplete or revised source data.',
      'warning'
    ));
  }
  if (expectedRangeEnabled && report.outlierCount > 0) {
    findings.push(localFinding(
      'predictor.quality.outlier',
      'Review predictor outliers',
      `${report.outlierCount} predictor value(s) fall outside the expected range.`,
      'warning'
    ));
  }
  return findings;
}

function localFinding(
  code: string,
  title: string,
  description: string,
  severity: 'error' | 'warning',
  settingsAction = false
): PredictorQualityFindingView {
  return { id: code, code, title, description, severity, settingsAction };
}

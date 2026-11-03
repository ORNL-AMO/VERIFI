import { Injectable, computed, inject } from '@angular/core';
import { BetterPlantsAssets } from '@platform/reports/better-plants-assets.service';
import { BetterPlantsWorkbookInput, buildBetterPlantsWorkbook } from '@platform/reports/better-plants-workbook';
import { BetterPlantsSummary } from '@data/models/overview-report';
import { ReportArtifact, ReportExportContext, ReportExportFormat, ReportExportSource, reportArtifact } from '@shared/report-output/report-output.models';
import { ReportExportController } from '@app/v1/reports/shared/output/report-export-controller';
import { AccountReportWorkbenchContext } from '../../workbench/account-report-workbench-context.service';
import { BetterPlantsReportService } from '../better-plants-report.service';
import { BetterPlantsDocument, buildBetterPlantsDocument } from '../better-plants-report.view';
import { BetterPlantsEditor } from '../editing/better-plants-editor.service';
import { composeBetterPlantsPdf } from './better-plants-pdf';

export interface BetterPlantsExportSnapshot {
  readonly document: BetterPlantsDocument;
  readonly workbook: BetterPlantsWorkbookInput;
}

@Injectable()
export class BetterPlantsOutputService {
  private readonly context = inject(AccountReportWorkbenchContext);
  private readonly report = inject(BetterPlantsReportService);
  private readonly editor = inject(BetterPlantsEditor);
  private readonly assets = inject(BetterPlantsAssets);

  readonly source = computed<ReportExportSource<BetterPlantsExportSnapshot>>(() => {
    const result = this.report.state(), report = this.context.report(), account = this.context.workspace.account();
    if (this.context.stage() !== 'report') return { state: 'unavailable', message: 'Open the Report stage to export.' };
    if (result.state !== 'ready' || !result.value?.completed || !result.value.summaries || !report || !account
      || !this.context.workspace.isReady() || this.context.workspace.hasPending()) {
      const transient = !!report && !!account && this.context.workspace.isReady()
        && (this.context.workspace.hasPending() || result.state === 'loading' || result.state === 'waiting');
      return { state: 'unavailable', transient,
        message: result.message || 'Save report changes and complete current Data Checks before exporting.' };
    }
    const category = result.value.inputs.analysis.analysisCategory, baselineYear = result.value.inputs.analysis.baselineYear;
    const document = buildBetterPlantsDocument(report, account, baselineYear, category, result.value.summaries, this.context.workspace.facilities());
    if (!document.pages.length) return { state: 'unavailable', message: 'No report periods are available to export.' };
    const workbook = { account, report, summaries: result.value.summaries, category, baselineYear };
    // Include precisely the presentation/template inputs, rather than the workspace revision or unrelated settings.
    const key = JSON.stringify([this.context.key(), document, result.value.summaries.map(summary => workbookContent(summary, category)), category, baselineYear,
      report.betterPlantsReportSetup, [account.name, account.contactName, account.address, account.city, account.state,
        account.zip, account.country, account.contactPhone, account.contactEmail]]);
    return { state: 'ready', key, value: { document, workbook } };
  });

  readonly output = new ReportExportController<BetterPlantsExportSnapshot>({
    formats: ['pdf', 'xlsx'], source: this.source, flush: () => this.editor.flush(),
    build: (format, snapshot, context) => this.build(format, snapshot, context)
  });

  private async build(format: ReportExportFormat, snapshot: BetterPlantsExportSnapshot,
    context: ReportExportContext): Promise<ReportArtifact> {
    if (format === 'pdf') {
      context.progress('Loading Better Plants form artwork…');
      const images = await this.assets.images(context.signal);
      context.progress('Building the Better Plants PDF…');
      const blob = await composeBetterPlantsPdf(snapshot.document, images, context.signal);
      return reportArtifact(blob, snapshot.document.name, format);
    }
    if (format === 'xlsx') {
      context.progress('Loading the Better Plants Excel template…');
      const template = await this.assets.template(snapshot.workbook.category, context.signal);
      context.progress('Building the Better Plants workbook…');
      const blob = await buildBetterPlantsWorkbook(template, snapshot.workbook, context.signal);
      return reportArtifact(blob, snapshot.document.name, format);
    }
    throw new Error('This output format is unavailable for Better Plants.');
  }
}

/** Only workbook-consumed fields belong in freshness; calculation results carry unused facility metadata. */
function workbookContent(summary: BetterPlantsSummary, category: 'energy' | 'water') {
  return {
    year: summary.reportYear,
    baseline: category === 'energy' ? summary.baselineYearEnergyResults : summary.baselineYearWaterResults,
    report: category === 'energy' ? summary.reportYearEnergyResults : summary.reportYearWaterResults,
    adjustments: [summary.reportYearAnalysisSummary.baselineAdjustmentForNormalization,
      summary.reportYearAnalysisSummary.baselineAdjustmentForOtherV2, summary.reportYearAnalysisSummary.newSavings],
    annualImprovement: summary.percentAnnualImprovement,
    totalImprovement: category === 'energy' ? summary.percentTotalEnergyImprovement : summary.percentTotalWaterImprovement,
    bankedSavings: category === 'energy' ? summary.totalEnergySavingsBanked : summary.totalWaterSavingsBanked,
    performance: summary.facilityPerformance.map(entry => entry.performance)
  };
}

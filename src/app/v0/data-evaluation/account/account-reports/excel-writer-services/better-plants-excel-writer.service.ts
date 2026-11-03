import { Injectable, inject } from '@angular/core';
import { BetterPlantsSummary } from '@data/models/overview-report';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { BetterPlantsAssets, BETTER_PLANTS_TEMPLATES } from '@platform/reports/better-plants-assets.service';
import { buildBetterPlantsWorkbook } from '@platform/reports/better-plants-workbook';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { reportArtifact } from '@shared/report-output/report-output.models';

/** Compatibility entrypoint; v1 owns its save/readiness/cancellation workflow separately. */
@Injectable({ providedIn: 'root' })
export class BetterPlantsExcelWriterService {
  private readonly assets = inject(BetterPlantsAssets);
  private readonly delivery = inject(ReportFileDeliveryService);

  async exportToExcel(report: IdbAccountReport, account: IdbAccount, summaries: BetterPlantsSummary[],
    analysisItem: IdbAccountAnalysisItem): Promise<void> {
    const category = analysisItem.analysisCategory;
    const template = await this.assets.template(category);
    const blob = await buildBetterPlantsWorkbook(template, { report, account, summaries, category, baselineYear: report.baselineYear });
    this.delivery.download(reportArtifact(blob, BETTER_PLANTS_TEMPLATES[category], 'xlsx'));
  }
}

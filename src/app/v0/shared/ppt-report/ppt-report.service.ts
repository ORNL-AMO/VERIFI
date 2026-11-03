import { Injectable, inject } from '@angular/core';
import { PptDocument } from '@shared/report-output/ppt-document';
import { reportArtifact } from '@shared/report-output/report-output.models';
import { PptReportWriter } from '@platform/reports/ppt-report-writer';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';

/** Compatibility entrypoint retaining legacy presentation geometry and native charts. */
@Injectable({ providedIn: 'root' })
export class PptReportService {
  private readonly writer = inject(PptReportWriter);
  private readonly delivery = inject(ReportFileDeliveryService);

  async buildPowerpoint(document: PptDocument, fileName: string): Promise<void> {
    const blob = await this.writer.build(document, { layout: 'legacy' });
    this.delivery.download(reportArtifact(blob, fileName, 'pptx'));
  }
}

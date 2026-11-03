import { Injectable, inject } from '@angular/core';
import { ReportDocument } from '@shared/report-output/report-document.model';
import { reportArtifact } from '@shared/report-output/report-output.models';
import { PdfReportWriter } from '@platform/reports/pdf-report-writer';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';

/** Compatibility entrypoint for existing v0 report adapters. */
@Injectable({ providedIn: 'root' })
export class ExportReportPdfService {
  private readonly writer = inject(PdfReportWriter);
  private readonly delivery = inject(ReportFileDeliveryService);

  async export(document: ReportDocument, fileName: string): Promise<void> {
    const blob = await this.writer.build(document);
    this.delivery.download(reportArtifact(blob, fileName, 'pdf'));
  }
}

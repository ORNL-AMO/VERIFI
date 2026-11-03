import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { ReportArtifact } from '@shared/report-output/report-output.models';

/** File generation is complete before this boundary initiates a renderer download. */
@Injectable({ providedIn: 'root' })
export class ReportFileDeliveryService {
  private readonly document = inject(DOCUMENT);

  download(artifact: ReportArtifact, signal?: AbortSignal): void {
    signal?.throwIfAborted();
    if (!artifact.blob.size) throw new Error('The generated report is empty. Try generating it again.');
    const url = URL.createObjectURL(artifact.blob);
    const link = this.document.createElement('a');
    try {
      link.href = url;
      link.download = artifact.fileName;
      this.document.body.appendChild(link);
      signal?.throwIfAborted();
      link.click();
    } finally {
      link.remove();
      // Let the browser accept the download before releasing its source URL.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}

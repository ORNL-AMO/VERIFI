import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BrowserBackupDownloadService {
  downloadText(contents: string, fileName: string, mimeType = 'application/json'): void {
    const url = `data:${mimeType};charset=utf-8,${encodeURIComponent(contents)}`;
    this.downloadUrl(url, fileName);
  }

  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    try {
      this.downloadUrl(url, fileName);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private downloadUrl(url: string, fileName: string): void {
    const link = window.document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }
}

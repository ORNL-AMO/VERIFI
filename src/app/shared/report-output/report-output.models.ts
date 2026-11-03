export type ReportExportFormat = 'pdf' | 'pptx' | 'xlsx';

export interface ReportArtifact {
  readonly blob: Blob;
  readonly fileName: string;
  readonly mimeType: string;
}

export type ReportExportSource<T> =
  | { readonly state: 'ready'; readonly key: string; readonly value: T }
  | { readonly state: 'unavailable'; readonly message: string; readonly transient?: boolean };

export interface ReportExportContext {
  readonly signal: AbortSignal;
  progress(message: string, completed?: number, total?: number): void;
}

const MIME_TYPES: Record<ReportExportFormat, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

export function reportFileName(name: string, format: ReportExportFormat): string {
  const base = name.replace(/\.(pdf|pptx|xlsx)$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim().replace(/[. ]+$/, '');
  return `${base || 'Report'}.${format}`;
}

export function reportArtifact(blob: Blob, name: string, format: ReportExportFormat): ReportArtifact {
  const mimeType = MIME_TYPES[format];
  return { blob: blob.type === mimeType ? blob : new Blob([blob], { type: mimeType }), fileName: reportFileName(name, format), mimeType };
}

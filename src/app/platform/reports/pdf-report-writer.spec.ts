import { PdfReportWriter } from './pdf-report-writer';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ReportDocument } from '@shared/report-output/report-document.model';
import { TextSection, ReportSection } from '@shared/report-output/report-section.model';

describe('PdfReportWriter', () => {
  it('generates a PDF with wide tables and multi-page notes without downloading', async () => {
    const writer = new PdfReportWriter();
    const document: ReportDocument = { metadata: { title: 'Facility report', dateGenerated: '2026-01-01', skipPage: true }, sections: [
      { type: 'table', title: 'Annual results', headers: Array.from({ length: 15 }, (_, index) => `Column ${index}`),
        rows: Array.from({ length: 30 }, (_, row) => Array.from({ length: 15 }, (_, column) => `${row}-${column}`)) },
      { type: 'text', title: 'Notes', content: 'A complete narrative with no discarded content. '.repeat(900) }
    ] as ReportSection[] };
    const progress = vi.fn();
    const blob = await writer.build(document, { strictAssets: true, onProgress: progress });
    const content = await blobText(blob);
    await saveArtifact(blob, 'facility-layout.pdf');
    expect(blob.type).toBe('application/pdf');
    expect(content.startsWith('%PDF-')).toBe(true);
    expect((content.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(5);
    expect(progress).toHaveBeenLastCalledWith(2, 2);
  });

  it('fails required missing charts instead of returning a partial report', async () => {
    const document: ReportDocument = { metadata: { title: 'Report', dateGenerated: '', skipPage: true }, sections: [
      { type: 'chart', title: 'Annual use', imageDataProvider: async () => '' }
    ] as ReportSection[] };
    await expect(new PdfReportWriter().build(document, { strictAssets: true })).rejects.toThrow('Annual use');
    expect((await new PdfReportWriter().build(document)).size).toBeGreaterThan(0);
  });

  it('cancels between asynchronous providers and never resolves the next chart', async () => {
    const abort = new AbortController(), second = vi.fn(async () => '');
    const document: ReportDocument = { metadata: { title: 'Report', dateGenerated: '', skipPage: true }, sections: [
      { type: 'chart', imageDataProvider: async () => { abort.abort(); return ''; } },
      { type: 'chart', imageDataProvider: second }
    ] as ReportSection[] };
    await expect(new PdfReportWriter().build(document, { strictAssets: true, signal: abort.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(second).not.toHaveBeenCalled();
  });

  it('keeps concurrent document settings independent while providers await', async () => {
    let resume!: () => void;
    const hold = new Promise<void>(resolve => resume = resolve);
    const first: ReportDocument = { metadata: { title: 'First', dateGenerated: '', moduleColor: [255, 0, 0], skipPage: true },
      sections: [{ type: 'chart', imageDataProvider: async () => { await hold; return ''; } },
        { type: 'text', content: 'Red document' } as TextSection] as ReportSection[] };
    const second: ReportDocument = { metadata: { title: 'Second', dateGenerated: '', moduleColor: [0, 0, 255], skipPage: true },
      sections: [{ type: 'text', content: 'Blue document' } as TextSection] };
    const writer = new PdfReportWriter();
    const firstResult = writer.build(first);
    const blue = await writer.build(second);
    resume();
    const red = await firstResult;
    expect(await blobText(red)).toContain('/Title (First)');
    expect(await blobText(blue)).toContain('/Title (Second)');
  });

  it.each([false, true])('links a chart bookmark to the page chosen by image pagination (strict: %s)', async strictAssets => {
    const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC';
    const sections: ReportSection[] = [
      { type: 'text', content: Array.from({ length: 15 }, () => 'Report summary line').join('\n') },
      { type: 'chart', title: 'Annual chart', tocInclude: true, tocLabel: 'Annual chart', imageDataProvider: async () => image }
    ];
    const blob = await new PdfReportWriter().build({ metadata: { title: 'Report', dateGenerated: '', skipPage: true }, sections }, { strictAssets });
    const content = await blobText(blob);
    expect((content.match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
    expect(bookmarkPage(content, 'Annual chart')).toBe(2);
  });

  it.each(['text', 'table'] as const)('keeps a multi-page %s bookmark on its first page', async type => {
    const section: ReportSection = type === 'text'
      ? { type, content: 'Narrative line\n'.repeat(140), tocInclude: true, tocLabel: 'Details' }
      : { type, headers: ['Year', 'Value'], rows: Array.from({ length: 100 }, (_, index) => [String(index), '0']), tocInclude: true, tocLabel: 'Details' };
    const blob = await new PdfReportWriter().build({ metadata: { title: 'Report', dateGenerated: '', skipPage: true }, sections: [section] });
    const content = await blobText(blob);
    expect((content.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
    expect(bookmarkPage(content, 'Details')).toBe(1);
  });

  it('records an untitled table bookmark after automatic header pagination', async () => {
    const sections: ReportSection[] = [
      { type: 'text', content: 'Summary line\n'.repeat(15) },
      { type: 'table', headers: ['Tall header\n'.repeat(36)], rows: [['First row']], tocInclude: true, tocLabel: 'Table' }
    ];
    const content = await blobText(await new PdfReportWriter().build({ metadata: { title: 'Report', dateGenerated: '', skipPage: true }, sections }));
    expect((content.match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
    expect(bookmarkPage(content, 'Table')).toBe(2);
  });

  it('respects an explicit page break when linking a section bookmark', async () => {
    const sections: ReportSection[] = [
      { type: 'text', content: 'Summary' },
      { type: 'text', content: 'Details', pageBreakBefore: true, tocInclude: true, tocLabel: 'Details' }
    ];
    const content = await blobText(await new PdfReportWriter().build({ metadata: { title: 'Report', dateGenerated: '', skipPage: true }, sections }));
    expect(bookmarkPage(content, 'Details')).toBe(2);
  });
});

/** Page dictionaries and outline destinations remain uncompressed in the generated PDF. */
function bookmarkPage(content: string, title: string): number {
  const pages = [...content.matchAll(/(\d+) 0 obj\s*<<\s*\/Type \/Page\b/g)].map(match => match[1]);
  const bookmark = [...content.matchAll(/\/Title \(([^)]*)\)[\s\S]*?\/Dest \[(\d+) 0 R/g)].find(match => match[1] === title);
  expect(bookmark, `Missing bookmark: ${title}`).toBeDefined();
  const page = pages.indexOf(bookmark![2]) + 1;
  expect(page, `Invalid page reference for: ${title}`).toBeGreaterThan(0);
  return page;
}

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function saveArtifact(blob: Blob, name: string): Promise<void> {
  const directory = process.env['VERIFI_EXPORT_ARTIFACT_DIR'];
  if (!directory) return;
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, name), new Uint8Array(bytes));
}

import JSZip from 'jszip';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PptReportWriter } from './ppt-report-writer';
import { PptDocument } from '@shared/report-output/ppt-document';
import { getPptAxisSpec } from '@shared/report-output/ppt-slide';

describe('PptReportWriter', () => {
  it('keeps native charts and tables editable in a wide presentation', async () => {
    const document: PptDocument = { metadata: { title: 'Facility report' }, slides: [
      { type: 'chart', title: 'Annual consumption', chartType: 'bar', labels: ['2024', '2025'],
        series: [{ name: 'Use', data: [0, 12] }], valAxisMinVal: -1 },
      { type: 'table', title: 'Annual table', headers: ['Year', 'Use'], rows: [['2024', 0], ['2025', 12]] }
    ] };
    const result = await new PptReportWriter().build(document, { layout: 'wide', strictAssets: true });
    const zip = await load(result);
    saveArtifact(await zip.generateAsync({ type: 'uint8array' }), 'facility-native.pptx');
    expect(await zip.file('ppt/presentation.xml')!.async('string')).toContain('cx="12192000" cy="6858000"');
    expect(await zip.file('ppt/charts/chart1.xml')!.async('string')).toContain('<c:v>12</c:v>');
    expect(zip.file(/ppt\/embeddings\/.*\.xlsx$/).length).toBe(1);
    const table = await zip.file('ppt/slides/slide2.xml')!.async('string');
    expect(table).toContain('<a:tbl>');
    expect(table).toContain('2024');
    expect(table).toContain('sz="1200"');
    const heights = [...table.matchAll(/<a:tr h="(\d+)"/g)].map(match => Number(match[1]));
    expect(heights.length).toBe(3);
    expect(heights.every(height => height < 914400)).toBe(true);
  });

  it('repeats headers, titles and notes on native table continuations', async () => {
    const document: PptDocument = { metadata: { title: 'Long table' }, slides: [
      { type: 'table', title: 'Monthly report', headers: ['Period', 'Consumption'], subHeaders: ['Month', 'kWh'],
        rows: Array.from({ length: 120 }, (_, index) => [`Month ${index}`, index]), note: 'Banked values preserve their meaning.' }
    ] };
    const zip = await load(await new PptReportWriter().build(document, { layout: 'wide' }));
    const files = zip.file(/ppt\/slides\/slide\d+\.xml$/);
    saveArtifact(await zip.generateAsync({ type: 'uint8array' }), 'facility-continuations.pptx');
    expect(files.length).toBeGreaterThan(1);
    for (const file of files) {
      const xml = await file.async('string');
      expect(xml).toContain('Monthly report');
      expect(xml).toContain('Consumption');
      expect(xml).toContain('kWh');
      expect(xml).toContain('Banked values preserve their meaning.');
      expect([...xml.matchAll(/<a:tr h="(\d+)"/g)].every(match => Number(match[1]) < 914400)).toBe(true);
    }
  });

  it('uses the legacy geometry explicitly and retains negative axis values', async () => {
    const zip = await load(await new PptReportWriter().build({ metadata: { title: 'Legacy' }, slides: [{ type: 'title', title: 'Legacy' }] }));
    expect(await zip.file('ppt/presentation.xml')!.async('string')).toContain('cx="9144000" cy="5143500"');
    expect(getPptAxisSpec([-5, 0, 12]).min).toBeLessThanOrEqual(-5);
  });

  it('uses Arial and distinct title/subtitle sizes in wide presentations', async () => {
    const zip = await load(await new PptReportWriter().build({ metadata: { title: 'Cover' }, slides: [
      { type: 'title', title: 'Annual Analysis', subtitle: 'Facility A — Report Year 2025', date: '2026-01-01' }
    ] }, { layout: 'wide' }));
    const slide = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(slide).toContain('sz="3200"');
    expect(slide).toContain('sz="1800"');
    expect(slide).toContain('typeface="Arial"');
    for (const file of zip.file(/ppt\/slideLayouts\/slideLayout\d+\.xml$/)) {
      expect(await file.async('string')).not.toContain('Arial (Headings)');
    }
  });

  it('rejects required missing assets and null-like native chart values', async () => {
    const writer = new PptReportWriter();
    await expect(writer.build({ metadata: { title: 'Report' }, slides: [
      { type: 'image', title: 'Chart', imageDataProvider: async () => '' }
    ] }, { strictAssets: true })).rejects.toThrow('Chart');
    await expect(writer.build({ metadata: { title: 'Report' }, slides: [
      { type: 'chart', title: 'Use', chartType: 'line', labels: ['Year'], series: [{ name: 'Missing', data: [NaN] }] }
    ] }, { strictAssets: true })).rejects.toThrow('unavailable values');
  });

  it('stops after a cancelled asynchronous image provider', async () => {
    const abort = new AbortController(), second = vi.fn(async () => '');
    await expect(new PptReportWriter().build({ metadata: { title: 'Cancelled' }, slides: [
      { type: 'image', title: 'First', imageDataProvider: async () => { abort.abort(); return ''; } },
      { type: 'image', title: 'Second', imageDataProvider: second }
    ] }, { signal: abort.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(second).not.toHaveBeenCalled();
  });
});

async function load(blob: Blob): Promise<JSZip> {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  return JSZip.loadAsync(bytes);
}

function saveArtifact(bytes: Uint8Array, name: string): void {
  const directory = process.env['VERIFI_EXPORT_ARTIFACT_DIR'];
  if (!directory) return;
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, name), bytes);
}

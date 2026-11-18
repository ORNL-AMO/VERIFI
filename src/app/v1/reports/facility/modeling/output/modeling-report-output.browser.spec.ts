import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { server } from 'vitest/browser';
import JSZip from 'jszip';
import { PdfReportWriter } from '@platform/reports/pdf-report-writer';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportArtifact } from '@shared/report-output/report-output.models';
import { buildModelingReport } from '@domain/reports/modeling-report';
import { modelingExportFixture } from '@app/v1/reports/shared/modeling/testing/modeling-report-export-fixture';
import { modelingPdfDocument } from '@app/v1/reports/shared/modeling/output/modeling-report-pdf';
import { FacilityModelingReportService } from '../modeling-report.service';
import { ModelingReportOutputService } from './modeling-report-output.service';

describe('Modeling file output in Chromium', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('delivers a real searchable PDF with cover, landscape paper, bookmarks and no preview capture', async () => {
    const snapshot = modelingExportFixture(), delivered: ReportArtifact[] = [];
    const flush = vi.fn(async () => true);
    TestBed.configureTestingModule({ providers: [ModelingReportOutputService,
      { provide: FacilityModelingReportService, useValue: { state: signal({ state: 'ready' }), exportSnapshot: signal(snapshot),
        context: { stage: signal('report') }, editor: { setupValid: signal(true), flush } } },
      { provide: ReportFileDeliveryService, useValue: { download: (artifact: ReportArtifact) => delivered.push(artifact) } }
    ] });
    const output = TestBed.inject(ModelingReportOutputService).output;
    await output.generate('pdf');
    expect(flush).toHaveBeenCalledOnce(); expect(delivered).toHaveLength(1);
    const artifact = delivered[0], raw = new TextDecoder('windows-1252').decode(await artifact.blob.arrayBuffer());
    expect(raw.startsWith('%PDF-')).toBe(true); expect(artifact.mimeType).toBe('application/pdf');
    const paper = raw.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/)!;
    expect(Number(paper[1])).toBeCloseTo(841.89, 2); expect(Number(paper[2])).toBeCloseTo(595.28, 2);
    expect(raw).not.toContain('/Subtype /Image'); expect(raw).toContain('/Outlines');
    expect(['Issues Summary', 'Executive Summary', 'Data Validation Tables'].map(title => bookmarkPage(raw, title))).toEqual([2, 3, 4]);
    expect(bookmarkPage(raw, 'Plant A · Main meters')).toBe(4);
    expect(pageCount(raw)).toBe(4);
    expect(document.querySelector('app-modeling-report')).toBeNull();
    expect(output.state().phase).toBe('idle');
    await saveArtifact(artifact.blob, 'modeling-normal');
  });

  it('paginates long issue tables and validation groups without blank separator pages or missing bookmarks', async () => {
    const snapshot = modelingExportFixture(), item = snapshot.view.groups[0];
    const groups = [item, { ...item, group: { ...item.group, idbGroupId: 'other-group' },
      key: 'other', groupName: 'Next group', model: undefined, critical: [], moderate: [], minor: [] }];
    const longName = 'Main manufacturing building supporting equipment production and process heating meters';
    groups[0] = { ...item, groupName: longName, critical: Array.from({ length: 48 }, (_, index) =>
      `Issue ${index + 1}: Review the predictor readings and selected model before interpreting these diagnostic results.`) };
    groups[0].model = structuredClone(item.model);
    groups[0].model!.coef = Array.from({ length: 9 }, (_, index) => index ? -123456.789 : 0);
    groups[0].model!.predictorVariables = Array.from({ length: 8 }, (_, index) => ({ ...item.model!.predictorVariables[0],
      id: `predictor-${index}`, name: `Production predictor ${index + 1} for processing equipment` }));
    const view = buildModelingReport({ reportYear: 2023, groups, hasBlockingErrors: true }, snapshot.view.settings,
      { facilities: {}, groups: { group: longName, 'other-group': 'Next group' } });
    const blob = await TestBed.inject(PdfReportWriter).build(modelingPdfDocument({ ...snapshot, view }), { strictAssets: true });
    const raw = new TextDecoder('windows-1252').decode(await blob.arrayBuffer());
    const first = bookmarkPage(raw, `Plant A · ${longName}`), next = bookmarkPage(raw, 'Plant A · Next group');
    expect(bookmarkPage(raw, 'Executive Summary')).toBeGreaterThan(3);
    expect(first).toBe(bookmarkPage(raw, 'Data Validation Tables'));
    expect(next).toBeGreaterThan(first); expect(pageCount(raw)).toBe(next);
    await saveArtifact(blob, 'modeling-long');
  });

  it.each(['standard', 'generated', 'long', 'diagnostic'] as const)('exports editable %s PowerPoint content through the v1 output capability', async mode => {
    const snapshot = modelingExportFixture(), delivered: ReportArtifact[] = [];
    if (mode === 'generated') Object.assign(snapshot.view.groups[0].model!, { isUserDefinedModel: false, R2: 0, adjust_R2: 0, modelPValue: 0 });
    if (mode === 'diagnostic') {
      const item = snapshot.view.groups[0];
      const view = buildModelingReport({ reportYear: 2023, hasBlockingErrors: true, groups: [{ ...item, model: undefined,
        critical: ['Select an available model.'] }] }, snapshot.view.settings, { facilities: {}, groups: { group: 'Main meters' } });
      Object.assign(snapshot.view, view);
    }
    if (mode === 'long') {
      const item = structuredClone(snapshot.view.groups[0]);
      item.model!.predictorVariables = Array.from({ length: 8 }, (_, index) => ({ ...item.model!.predictorVariables[0],
        id: `predictor-${index}`, name: `Production predictor ${index + 1} for processing equipment` }));
      item.model!.coef = Array.from({ length: 9 }, (_, index) => index ? -123456.789 : 0);
      item.model!.SEPValidation = Array.from({ length: 8 }, (_, index) => ({ ...item.model!.SEPValidation[0],
        predictorVariable: `Production predictor ${index + 1} for processing equipment` }));
      const groups = Array.from({ length: 3 }, (_, index) => ({ ...item, group: { ...item.group, idbGroupId: `group-${index}` },
        critical: index ? [] : Array.from({ length: 24 }, (_, issue) => `Issue ${issue + 1}: Review the selected model and current predictor readings.`) }));
      const view = buildModelingReport({ reportYear: 2023, hasBlockingErrors: true, groups }, snapshot.view.settings, {
        facilities: {}, groups: Object.fromEntries(groups.map((item, index) => [item.group.idbGroupId,
          `Manufacturing equipment, production lines and process heating meters ${index + 1}`]))
      });
      Object.assign(snapshot.view, view);
    }
    TestBed.configureTestingModule({ providers: [ModelingReportOutputService,
      { provide: FacilityModelingReportService, useValue: { state: signal({ state: 'ready' }), exportSnapshot: signal(snapshot),
        context: { stage: signal('report') }, editor: { setupValid: signal(true), flush: async () => true } } },
      { provide: ReportFileDeliveryService, useValue: { download: (artifact: ReportArtifact) => delivered.push(artifact) } }
    ] });
    const output = TestBed.inject(ModelingReportOutputService).output;
    expect(output.formats).toEqual(['pdf', 'pptx']);
    await output.generate('pptx');
    expect(delivered).toHaveLength(1);
    const artifact = delivered[0], zip = await JSZip.loadAsync(await artifact.blob.arrayBuffer());
    expect(artifact.fileName).toContain('Modeling — 2023.pptx');
    expect(artifact.mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    const presentation = await zip.file('ppt/presentation.xml')!.async('string');
    expect(presentation).toContain('cx="12192000" cy="6858000"');
    const files = Object.values(zip.files).filter(file => /^ppt\/slides\/slide\d+\.xml$/.test(file.name))
      .sort((a, b) => Number(a.name.match(/slide(\d+)/)![1]) - Number(b.name.match(/slide(\d+)/)![1]));
    const xml = await Promise.all(files.map(file => file.async('string')));
    const documents = xml.map(slide => new DOMParser().parseFromString(slide, 'application/xml'));
    // Native table wrapping splits phrases into multiple editable text runs.
    const text = documents.flatMap(document => Array.from(document.getElementsByTagName('a:t'))
      .map(run => run.textContent?.trim())).join(' ').replace(/\s+/g, ' ');
    expect(documents.some(document => document.getElementsByTagName('a:tbl').length > 0)).toBe(true);
    expect(text.includes('Generated by VERIFI')).toBe(true);
    expect(text.includes('Facility / Group')).toBe(true);
    expect(Object.keys(zip.files).some(name => /^ppt\/media\//.test(name) && !zip.files[name].dir)).toBe(false);
    const tableFonts = documents.flatMap(document => Array.from(document.getElementsByTagName('a:tbl'))
      .flatMap(table => Array.from(table.getElementsByTagName('a:rPr')).map(run => Number(run.getAttribute('sz'))).filter(Boolean)));
    expect(tableFonts.length).toBeGreaterThan(0); expect(Math.min(...tableFonts)).toBeGreaterThanOrEqual(1200);
    if (mode === 'generated') expect(text.includes('0.000')).toBe(true);
    if (mode === 'diagnostic') expect(text.includes('Predictor validation is unavailable for this model.')).toBe(true);
    if (mode === 'long') { expect(text.includes('predictor 8')).toBe(true); expect(text.includes('continued')).toBe(true); }
    expect(document.querySelector('app-modeling-report')).toBeNull();
    expect(output.state().phase).toBe('idle');
    await saveArtifact(artifact.blob, `modeling-${mode}`, 'pptx');
  });
});

function pageCount(content: string): number { return (content.match(/\/Type \/Page\b/g) ?? []).length; }
function bookmarkPage(content: string, title: string): number {
  const pages = [...content.matchAll(/(\d+) 0 obj\s*<<\s*\/Type \/Page\b/g)].map(match => match[1]);
  const bookmark = [...content.matchAll(/\/Title \(([^)]*)\)[\s\S]*?\/Dest \[(\d+) 0 R/g)].find(match => match[1] === title);
  expect(bookmark, `Missing bookmark: ${title}`).toBeDefined();
  return pages.indexOf(bookmark![2]) + 1;
}
async function saveArtifact(blob: Blob, name: string, extension = 'pdf'): Promise<void> {
  const directory = server.config.env['VERIFI_EXPORT_ARTIFACT_DIR'] as string | undefined;
  if (!directory) return;
  const encoded = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob);
  });
  await server.commands.writeFile(`${directory}/${name}.${extension}`, encoded, 'base64');
}

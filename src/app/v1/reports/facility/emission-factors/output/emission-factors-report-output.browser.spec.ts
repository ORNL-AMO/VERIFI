import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { server } from 'vitest/browser';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { PdfReportWriter } from '@platform/reports/pdf-report-writer';
import { ReportArtifact } from '@shared/report-output/report-output.models';
import { EmissionFactorsReportService } from '../emission-factors-report.service';
import { emissionFactorsOutputSnapshot } from '../testing/emission-factors-output-fixtures';
import { EmissionFactorsReportOutputService } from './emission-factors-report-output.service';

describe('Emission Factors real PDF in Chromium', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each(['standard', 'dense'] as const)('exports a %s PDF independently of the mounted preview', async kind => {
    const original = emissionFactorsOutputSnapshot();
    const snapshot = kind === 'standard' ? original : { ...original, startYear: 1990,
      name: 'Emission Factors - multiple processes and production lines', results: { ...original.results,
        electricity: Array.from({ length: 35 }, (_, index) => ({ ...original.results.electricity[0], year: 1990 + index })),
        other: Array.from({ length: 60 }, (_, index) => ({ ...original.results.other[0], meterGuid: `meter-${index}`,
          meterName: `Natural gas for the production equipment, supporting processes and utility systems ${index + 1}` })) } };
    const delivered: ReportArtifact[] = [], flush = vi.fn(async () => true);
    TestBed.configureTestingModule({ providers: [EmissionFactorsReportOutputService,
      { provide: EmissionFactorsReportService, useValue: { state: signal({ state: 'ready' }), exportSnapshot: signal(snapshot),
        context: { stage: signal('report') }, editor: { setupValid: signal(true), flush } } },
      { provide: ReportFileDeliveryService, useValue: { download: (artifact: ReportArtifact) => delivered.push(artifact) } }
    ] });
    const build = vi.spyOn(TestBed.inject(PdfReportWriter), 'build');
    const output = TestBed.inject(EmissionFactorsReportOutputService).output;
    await output.generate('pdf');
    expect(output.state().phase).toBe('idle'); expect(delivered).toHaveLength(1); expect(flush).toHaveBeenCalledOnce();
    expect(document.querySelector('app-emission-factors-report-preview')).toBeNull();
    const bytes = await delivered[0].blob.arrayBuffer(), raw = new TextDecoder().decode(bytes);
    expect(raw.startsWith('%PDF-')).toBe(true); expect(raw).toContain('/Outlines');
    expect(raw).toContain('/Title (Electricity Emission Factors)'); expect(raw).toContain('/Title (Other Emission Factors)');
    const pages = [...raw.matchAll(/\/Type \/Page\b/g)].length;
    if (kind === 'standard') expect(pages).toBe(2);
    else expect(pages).toBeGreaterThanOrEqual(4);
    expect(build.mock.calls[0][1]).toMatchObject({ strictAssets: true, orientation: 'landscape' });
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(reader.error); reader.readAsDataURL(delivered[0].blob);
    });
    await server.commands.writeFile(`.angular/emission-factors-${kind}.pdf`, encoded, 'base64');
  });
});

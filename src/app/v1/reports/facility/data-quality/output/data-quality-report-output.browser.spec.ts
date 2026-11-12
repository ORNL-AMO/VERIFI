import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { server } from 'vitest/browser';
import { PdfReportWriter } from '@platform/reports/pdf-report-writer';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportArtifact } from '@shared/report-output/report-output.models';
import { buildMeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { buildPredictorDataQualityReport } from '@domain/calculations/data-quality/predictor-data-quality';
import { DataQualityReportService } from '../data-quality-report.service';
import { DataQualityReportSnapshot } from '../data-quality-report.view';
import {
  dataQualityPdfSnapshot, dataQualityPredictorReadingsSnapshot
} from '../testing/data-quality-report-test-fixtures';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { DataQualityReportOutputService } from './data-quality-report-output.service';
import { dataQualityPdfDocument } from './data-quality-report-output.view';
import { METER_CONTENT_FLAGS, PREDICTOR_CONTENT_FLAGS } from '../data-quality-report-settings';

describe('Data Quality PDF in Chromium', () => {
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });
  it.each(['manual', 'analysis'] as const)(
    'renders a real %s PDF with independent charts, warnings, long names, and annual totals', async mode => {
      const snapshot = dataQualityPdfSnapshot();
      snapshot.settings.selectedMode = mode;
      snapshot.settings.selectedAnalysisItemId = mode === 'analysis' ? 'analysis-a' : null;
      snapshot.name = 'Complete Data Quality Report';
      snapshot.facility.name = 'Example manufacturing facility with multiple processes and production lines';
      const meter = snapshot.results.meters[0];
      meter.meter.name = 'Electricity for the main manufacturing building and supporting production equipment';
      const other = buildMeterDataQualityReport(meter.meterData.map(row => ({ ...row, totalCost: 0 })), {
        ...meter.meter, guid: 'other-meter', name: 'Solar generation without recorded costs', includeInEnergy: false
      });
      snapshot.results.meters.push(other);
      snapshot.settings.selectedMeterIds.push(other.meter.guid);
      const predictor = snapshot.results.predictors[0];
      if (mode === 'analysis') snapshot.results.predictors = [buildPredictorDataQualityReport(predictor.readings, {
        ...predictor.predictor, predictorType: 'Weather', weatherDataType: 'HDD', heatingBaseTemperature: 60
      })];
      const annual = snapshot.results.annualTotals[0];
      annual.rows = Array.from({ length: 28 }, (_, index) => ({ ...annual.rows[0], year: 2000 + index }));
      const source: DataQualityReportSnapshot = mode === 'manual' ? snapshot : {
        ...snapshot, results: { ...snapshot.results, annualTotals: [{ ...annual, columns: [
          { key: 'year', label: 'Year' },
          { key: 'energyConsumption', label: 'Total Consumption', unit: 'ft3' },
          { key: 'energyUse', label: 'Total Energy', unit: 'MMBtu' },
          { key: 'totalWithMarketEmissions', label: 'Total Market-Based Emissions', unit: 'tonne CO₂e' },
          { key: 'totalWithLocationEmissions', label: 'Total Location-Based Emissions', unit: 'tonne CO₂e' },
          { key: 'stationaryBiogenicEmmissions', label: 'Total Biogenic Emissions', unit: 'tonne CO₂e' },
          { key: 'stationaryCarbonEmissions', label: 'Total Carbon Emissions', unit: 'tonne CO₂e' },
          { key: 'stationaryOtherEmissions', label: 'Total Other Emissions', unit: 'tonne CO₂e' },
          { key: 'stationaryEmissions', label: 'Total Emissions', unit: 'tonne CO₂e' },
          { key: 'energyCost', label: 'Total Cost', unit: '$' }
        ] }] }
      };
      const delivered: ReportArtifact[] = [];
      const flush = vi.fn(async () => true);
      TestBed.configureTestingModule({ providers: [DataQualityReportOutputService,
        { provide: DataQualityReportService, useValue: {
          state: signal({ state: 'ready' }), exportSnapshot: signal(source), context: { stage: signal('report') },
          editor: { setupValid: signal(true), flush }
        } },
        { provide: ReportFileDeliveryService, useValue: {
          download: (artifact: ReportArtifact) => delivered.push(artifact)
        } }
      ] });
      const writer = vi.spyOn(TestBed.inject(PdfReportWriter), 'build');
      const output = TestBed.inject(DataQualityReportOutputService).output;
      expect(document.querySelector('app-data-quality-report-preview')).toBeNull();
      await output.generate('pdf');
      expect(output.state().phase).toBe('idle');
      expect(delivered).toHaveLength(1);
      expect(flush).toHaveBeenCalledOnce();
      const artifact = delivered[0], bytes = await artifact.blob.arrayBuffer();
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
      expect(artifact.blob.type).toBe('application/pdf');
      const raw = new TextDecoder().decode(bytes);
      expect(raw).toContain('/DCTDecode');
      expect((raw.match(/\/Subtype \/Image/g) ?? []).length).toBeGreaterThanOrEqual(6);
      expect((raw.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(2);
      expect(raw).toContain('/Outlines');
      const sections = writer.mock.calls[0][0].sections;
      expect(sections.some(section => section.title === 'Cost charts unavailable')).toBe(true);
      expect(sections.some(section => section.title?.includes('Number of bins: 7'))).toBe(true);
      expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
      expect(output.formats).toEqual(['pdf']);
      await savePdfArtifact(artifact.blob, `data-quality-${mode}`);
    }, 30000
  );

  it('starts each source on a fresh page after annual-table continuation without adding blank pages', async () => {
    const snapshot = dataQualityPdfSnapshot();
    for (const flag of [...METER_CONTENT_FLAGS, ...PREDICTOR_CONTENT_FLAGS]) snapshot.settings[flag] = false;
    snapshot.settings.includePredictorStatisticsTable = true;
    const meter = snapshot.results.meters[0], predictor = snapshot.results.predictors[0];
    snapshot.results.meters.push({ ...meter, meter: { ...meter.meter, guid: 'meter-b', name: 'Next meter' } });
    snapshot.results.predictors.push({ ...predictor,
      predictor: { ...predictor.predictor, guid: 'predictor-b', name: 'Next predictor' } });
    const annual = snapshot.results.annualTotals[0], originalRows = annual.rows;
    annual.rows = Array.from({ length: 28 }, (_, index) => ({ ...originalRows[0], year: 2000 + index }));
    snapshot.results.annualTotals.push({ ...annual, meterGuid: 'meter-b', rows: originalRows });
    const { document } = dataQualityPdfDocument(snapshot);
    const blob = await TestBed.inject(PdfReportWriter).build(document, {
      strictAssets: true, orientation: 'landscape', format: 'a4'
    });
    const raw = new TextDecoder().decode(await blob.arrayBuffer());
    const sources = ['Meter: Meter a', 'Meter: Next meter', 'Predictor: Predictor a', 'Predictor: Next predictor'];
    expect(sources.map(title => bookmarkPage(raw, title))).toEqual([2, 4, 5, 6]);
    expect((raw.match(/\/Type \/Page\b/g) ?? []).length).toBe(6);
    await savePdfArtifact(blob, 'data-quality-source-pages');
  });

  it('exports through the routed workbench button using current saved selection and readings', async () => {
    const snapshot = dataQualityPredictorReadingsSnapshot();
    snapshot.facilityReports[0].dataQualityReportSettings.includeMeterCostHistogram = true;
    const delivered: ReportArtifact[] = [];
    const view = await setupReportWorkbench(snapshot.facilityReports, [
      { provide: ReportFileDeliveryService, useValue: {
        download: (artifact: ReportArtifact) => delivered.push(artifact)
      } }
    ], snapshot);
    const workbench = await view.open('report-a', 'report');
    const output = workbench.workbench.session()!.runtime.output!;
    await vi.waitFor(() => { view.harness.detectChanges(); expect(output.available()).toBe(true); });
    const button = view.harness.routeNativeElement!
      .querySelector<HTMLButtonElement>('footer app-report-output-actions button')!;
    expect(button.disabled).toBe(false);
    button.click();
    await vi.waitFor(() => expect(delivered).toHaveLength(1), { timeout: 15000 });
    expect(await delivered[0].blob.slice(0, 5).text()).toBe('%PDF-');
    expect(view.updateSetup).not.toHaveBeenCalled();
    expect(view.harness.routeNativeElement!.textContent).not.toContain('PDF export is not available yet.');
    expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
  }, 30000);
});

/** Page dictionaries and outline destinations remain uncompressed in the generated PDF. */
function bookmarkPage(content: string, title: string): number {
  const pages = [...content.matchAll(/(\d+) 0 obj\s*<<\s*\/Type \/Page\b/g)].map(match => match[1]);
  const bookmark = [...content.matchAll(/\/Title \(([^)]*)\)[\s\S]*?\/Dest \[(\d+) 0 R/g)]
    .find(match => match[1] === title);
  expect(bookmark, `Missing bookmark: ${title}`).toBeDefined();
  return pages.indexOf(bookmark![2]) + 1;
}

async function savePdfArtifact(blob: Blob, name: string): Promise<void> {
  const directory = server.config.env['VERIFI_EXPORT_ARTIFACT_DIR'] as string | undefined;
  if (!directory) return;
  const encoded = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob);
  });
  await server.commands.writeFile(`${directory}/${name}.pdf`, encoded, 'base64');
}

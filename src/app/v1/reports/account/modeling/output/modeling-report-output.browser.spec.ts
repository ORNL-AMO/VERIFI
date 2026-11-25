import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { server } from 'vitest/browser';
import JSZip from 'jszip';
import * as ExcelJS from 'exceljs';
import { ReportFileDeliveryService } from '@platform/reports/report-file-delivery.service';
import { ReportArtifact } from '@shared/report-output/report-output.models';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { calculateModelingReport } from '@domain/reports/modeling-report-calculation';
import { buildModelingReport } from '@domain/reports/modeling-report';
import { projectWorkspaceCalendarization } from '@app/v1/shared/calendarization/workspace-calendarization-projection';
import { modelingCalculationRequest } from '@app/v1/reports/shared/modeling/modeling-report-controller';
import { AccountModelingReportService } from '../modeling-report.service';
import { AccountModelingReportOutputService } from './modeling-report-output.service';
import { accountModelingSnapshot, addSecondModelingFacility, modelingBase } from '../testing/modeling-report-test-fixtures';

describe('account Modeling file output', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each(['pdf', 'pptx', 'xlsx'] as const)('exports multi-facility %s charts and qualified model identities without mounting a preview', async format => {
    const snapshot = accountModelingSnapshot(); addSecondModelingFacility(snapshot);
    const base = modelingBase(snapshot), inputs = buildAnalysisReportInputs(snapshot, 'account-analysis');
    const request = modelingCalculationRequest('account:report', inputs, 2023, true,
      projection => projectWorkspaceCalendarization(base, snapshot, projection)).calculation!.request;
    if (request.operation !== 'modeling') throw new Error('Unexpected operation');
    const view = buildModelingReport(calculateModelingReport(request.inputs, 2023, request.chartMeters), {
      includeIssuesSummary: true, includeExecutiveSummary: true, includeDataValidationTables: true
    }, { facilities: { facility: 'Plant A', 'facility-b': 'Plant B' }, groups: { group: 'Main meters', 'group-b': 'Main meters' } }, 'account');
    const delivered: ReportArtifact[] = [];
    TestBed.configureTestingModule({ providers: [AccountModelingReportOutputService,
      { provide: AccountModelingReportService, useValue: { state: signal({ state: 'ready' }),
        exportSnapshot: signal({ identity: 'account:report', name: 'Portfolio modeling', scopeName: 'Portfolio', view }),
        context: { stage: signal('report') }, editor: { setupValid: signal(true), flush: async () => true } } },
      { provide: ReportFileDeliveryService, useValue: { download: (artifact: ReportArtifact) => delivered.push(artifact) } }
    ] });
    const output = TestBed.inject(AccountModelingReportOutputService).output;
    await output.generate(format); expect(delivered).toHaveLength(1);
    const artifact = delivered[0]; expect(artifact.fileName).toContain('Portfolio');
    if (format === 'pdf') {
      const raw = new TextDecoder('windows-1252').decode(await artifact.blob.arrayBuffer());
      expect(raw.startsWith('%PDF-')).toBe(true); expect(raw).toContain('/Subtype /Image');
      for (const name of ['Plant A', 'Plant B', 'Main meters']) expect(raw).toContain(name);
      expect(raw).toContain('/Outlines');
    } else if (format === 'pptx') {
      const zip = await JSZip.loadAsync(await artifact.blob.arrayBuffer());
      const slides = await Promise.all(Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).map(name => zip.file(name)!.async('string')));
      const content = slides.join('\n');
      for (const name of ['Plant A', 'Plant B', 'Main meters']) expect(content).toContain(name);
      expect(content).toContain('<a:tbl>'); expect(content).toContain('<p:pic>');
    }
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await artifact.blob.arrayBuffer());
      expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Executive Summary']);
      const sheet = workbook.getWorksheet('Executive Summary')!;
      expect(sheet.getCell('A2').value).toBe('Plant A'); expect(sheet.getCell('A3').value).toBe('Plant B');
      expect(sheet.getCell('B2').value).toBe('Main meters'); expect(sheet.getCell('L2').value).toBe(5);
      expect(sheet.getCell('M2').value).toBe('Predictor 0'); expect(sheet.getCell('N2').value).toBe(1);
      expect(sheet.getCell('C2').type).toBe(ExcelJS.ValueType.Number);
      expect(artifact.fileName).toBe('Portfolio modeling_Executive_Summary_VERIFI.xlsx');
    }
    expect(document.querySelector('app-modeling-report')).toBeNull();
    const directory = server.config.env['VERIFI_EXPORT_ARTIFACT_DIR'] as string | undefined;
    if (directory) {
      const bytes = new Uint8Array(await artifact.blob.arrayBuffer());
      let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
      await server.commands.writeFile(`${directory}/account-modeling.${format}`, btoa(binary), 'base64');
    }
  }, 30000);
});

import { buildModelingReport } from '@domain/reports/modeling-report';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { modelingModelDetails } from '../modeling-report-tables';
import { modelingExportFixture } from '../testing/modeling-report-export-fixture';
import { modelingPdfDocument, modelingPdfSections } from './modeling-report-pdf';
import { TableSection } from '@shared/report-output/report-section.model';

describe('Modeling PDF composition', () => {
  it('omits cutoff text without changing its chart title or model statistics', () => {
    const snapshot = modelingExportFixture(), normal = modelingPdfSections(snapshot.view);
    const sections = modelingPdfSections({ ...snapshot.view, reportYear: 2024 });
    expect(sections.find(section => section.type === 'chart')?.title).toBe(normal.find(section => section.type === 'chart')?.title);
    expect(JSON.stringify(sections)).not.toContain('Chart through');
    expect(sections.filter(section => section.type === 'table')).toEqual(normal.filter(section => section.type === 'table'));
  });
  it('retains facility-qualified group identities for account-scoped details', () => {
    const snapshot = modelingExportFixture();
    const sections = modelingPdfSections({ ...snapshot.view, scope: 'account' });
    const details = sections.find(section => section.type === 'table' && section.equation);
    expect(details?.type === 'table' && details.headers.slice(0, 2)).toEqual(['Facility', 'Group']);
    expect(sections.some(section => section.tocLabel === 'Plant A · Main meters')).toBe(true);
  });
  it.each(Array.from({ length: 8 }, (_, mask) => mask))('exports exactly the selected sections (mask %i)', mask => {
    const snapshot = modelingExportFixture();
    const settings = { includeIssuesSummary: !!(mask & 1), includeExecutiveSummary: !!(mask & 2), includeDataValidationTables: !!(mask & 4) };
    const sections = modelingPdfSections({ ...snapshot.view, settings });
    expect(sections.filter(section => section.type === 'heading').map(section => section.title)).toEqual([
      ...(settings.includeIssuesSummary ? ['Issues Summary'] : []),
      ...(settings.includeExecutiveSummary ? ['Executive Summary'] : []),
      ...(settings.includeDataValidationTables ? ['Model Details'] : [])
    ]);
    expect(sections.filter(section => section.type === 'heading').every(section => section.pageBreakBefore && section.tocInclude)).toBe(true);
    if (settings.includeDataValidationTables) {
      const validation = sections.slice(sections.findIndex(section => section.type === 'heading' && section.title === 'Model Details') + 1);
      expect(validation.filter(section => section.type === 'table').map(section => section.title)).toEqual([undefined, undefined]);
      expect(validation.some(section => section.type === 'styledText' && section.tocInclude && section.bookmarkLevel === 1)).toBe(true);
      const content = validation.filter(section => section.type === 'table' || section.type === 'chart');
      expect(content.map(section => section.type)).toEqual(['table', 'chart', 'table']);
      expect(content[0].type === 'table' && content[0].equation?.expression).toBe(modelingModelDetails(snapshot.view.regression[0]).formula);
      expect(content[0].type === 'table' && content[0].headers).not.toContain('Formula');
      expect(content[0].type === 'table' && content[0].headers).not.toContain('Facility');
      expect(content[0].type === 'table' && content[0].headers).not.toContain('Group');
      expect(content[0].type === 'table' && content[0].rows[0]).toHaveLength(6);
      expect(content[0].type === 'table' && content[0].rows[0][0]).toContain('User defined');
      expect(validation.find(section => section.type === 'styledText' && section.bookmarkLevel === 1)?.tocLabel).toBe('Main meters');
    }
    if (!mask) expect(sections).toEqual([]);
  });

  it('shares preview precision, preserves zero statistics, and exports validation failures explicitly', () => {
    const snapshot = modelingExportFixture(), group = snapshot.view.groups[0];
    Object.assign(group.model!, { isUserDefinedModel: false, R2: 0, adjust_R2: .456789, modelPValue: 0, t: { p: [1, 0, .1234] } });
    group.model!.SEPValidation[0].modelMinValid = false;
    group.model!.SEPValidation[0].isValid = false;
    const details = modelingModelDetails(group), sections = modelingPdfSections(snapshot.view);
    const table = sections.find(section => section.type === 'table' && section.title === 'Analysis Type: Regression');
    expect(table?.type === 'table' && table.rows[0]).toEqual([
      'Plant A', 'Main meters', '2022', 'Predictor 0: 0.00\nPredictor 1: 0.12',
      details.r2, details.adjustedR2, details.modelPValue, details.formula, group.minor.join('\n') || '-'
    ]);
    expect(details).toMatchObject({ r2: '0.000', adjustedR2: '0.457', modelPValue: '0.00' });
    const validation = sections.find(section => section.type === 'table' && section.headers[0] === 'Validation measure');
    expect(validation?.type).toBe('table');
    if (validation?.type !== 'table') throw new Error('Missing validation table');
    expect(validation.rows[0][1]).toBe(new AnalysisResultNumberPipe().transform(group.model!.SEPValidation[0].meanReportYear));
    expect(validation.rows[2][1]).toContain(' - Fail');
    expect(validation.rows.at(-1)![1]).toBe('Fail');
  });

  it('keeps user-defined formulas and periods without fabricating fit statistics', () => {
    const snapshot = modelingExportFixture(), original = structuredClone(snapshot);
    const document = modelingPdfDocument(snapshot);
    const table = document.sections.find((section): section is TableSection => section.type === 'table' && section.title === 'Analysis Type: Regression');
    expect(table?.type === 'table' && table.rows[0].slice(1, 8)).toEqual([
      'Main meters\nUser defined', '1/2022 - 12/2022', '-', '-', '-', '-', modelingModelDetails(snapshot.view.groups[0]).formula
    ]);
    expect(document.metadata).toMatchObject({ title: snapshot.name, subtitle: 'Generated by VERIFI' });
    expect(snapshot).toEqual(original);
  });

  it('exports all issue severities, missing models, and unavailable validation as diagnostic content', () => {
    const snapshot = modelingExportFixture(), item = snapshot.view.groups[0];
    const view = buildModelingReport({ reportYear: 2023, hasBlockingErrors: true, groups: [{ ...item, model: undefined,
      critical: ['Select a model.'], moderate: ['Outside model range.'], minor: ['Check period.'] }] }, snapshot.view.settings, {
      facilities: { facility: 'Current facility' }, groups: { group: 'Current group' }
    });
    const sections = modelingPdfSections(view), text = JSON.stringify(sections);
    for (const title of ['Critical issues', 'Moderate issues', 'Minor issues']) {
      expect(sections.some(section => section.type === 'table' && section.title === title)).toBe(true);
    }
    expect(text).toContain('Current facility'); expect(text).toContain('Current group');
    expect(text).toContain('Model unavailable'); expect(text).toContain('Predictor validation is unavailable');
  });

  it('includes classic intensity, modified intensity, and absolute consumption and explains empty results', () => {
    const snapshot = modelingExportFixture(), item = snapshot.view.groups[0];
    const view = buildModelingReport({ reportYear: 2023, hasBlockingErrors: false,
      groups: (['energyIntensity', 'modifiedEnergyIntensity', 'absoluteEnergyConsumption'] as const).map(analysisType => ({ ...item,
        group: { ...item.group, analysisType }, critical: [], moderate: [], minor: [] })) }, snapshot.view.settings, { facilities: {}, groups: {} });
    let sections = modelingPdfSections(view);
    expect(sections.filter(section => section.type === 'table').map(section => section.title)).toEqual([
      'Analysis Type: Classic Intensity', 'Analysis Type: Modified Intensity', 'Analysis Type: Absolute Consumption'
    ]);
    expect(JSON.stringify(sections)).toContain('No issues identified.');
    expect(JSON.stringify(sections)).toContain('No regression groups are included.');
    const empty = buildModelingReport({ reportYear: 2023, hasBlockingErrors: false, groups: [] }, snapshot.view.settings, { facilities: {}, groups: {} });
    sections = modelingPdfSections(empty);
    expect(JSON.stringify(sections)).toContain('No included analysis groups are available.');
    expect(JSON.stringify(sections)).toContain('Executive summary is unavailable.');
  });
});

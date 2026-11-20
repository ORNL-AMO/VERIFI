import { TableSection } from '@shared/report-output/report-section.model';
import { emissionFactorsTableView } from '@app/v1/reports/shared/emission-factors/emission-factors-table.view';
import { emissionFactorsOutputSnapshot } from '../testing/emission-factors-output-fixtures';
import { emissionFactorsPdfDocument } from './emission-factors-report-output.view';

describe('Emission Factors PDF projection', () => {
  it('shares preview precision, inclusive rows, units, and category order without mutating results', () => {
    const snapshot = emissionFactorsOutputSnapshot(), before = structuredClone(snapshot);
    const document = emissionFactorsPdfDocument(snapshot), view = emissionFactorsTableView(snapshot.results);
    const tables = document.sections.filter((section): section is TableSection => section.type === 'table');
    expect(tables).toHaveLength(2);
    expect(tables[0].rows[0]).toEqual(['2022', ...view.electricity[0].marketValues, ...view.electricity[0].locationValues]);
    expect(tables[0].rows).toHaveLength(3); expect(tables[0].rows[0]).toContain('100.123');
    expect(tables[1].rows[0]).toContain('53.06 g CO2/MMBtu');
    expect(document.sections.find(section => section.title === 'Other Emission Factors')?.pageBreakBefore).toBe(true);
    expect(document.metadata.skipPage).toBe(true); expect(snapshot).toEqual(before);
  });
  it('retains zero-as-dash fuel values and unresolved fuel guidance with PDF-safe chemical labels', () => {
    const snapshot = emissionFactorsOutputSnapshot();
    const document = emissionFactorsPdfDocument({ ...snapshot, results: { ...snapshot.results, electricity: [], other: [{
      meterGuid: 'missing', meterName: 'Mobile', source: 'Other Fuels', fuelValue: '', CO2: 0, unit: 'gal', unavailable: 'Fuel unavailable'
    }] } });
    const table = document.sections.find((section): section is TableSection => section.type === 'table')!;
    expect(table.rows).toEqual([['Mobile\nFuel unavailable', 'Other Fuels', '-', '-', '-', '-']]);
    expect(document.sections.find(section => section.title === 'Other Emission Factors')?.pageBreakBefore).toBe(false);
  });
});

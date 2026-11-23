import { TableSection } from '@shared/report-output/report-section.model';
import { emissionFactorsPdfSections } from '@app/v1/reports/shared/emission-factors/emission-factors-pdf';
import { accountEmissionFactorsOutputSnapshot } from '../testing/emission-factors-fixtures';
import { accountEmissionFactorsPdfDocument } from './emission-factors-report-output.view';

describe('account Emission Factors PDF projection', () => {
  it('retains facility order, category page breaks, shared values, and empty-facility guidance', () => {
    const snapshot = accountEmissionFactorsOutputSnapshot(), before = structuredClone(snapshot);
    const document = accountEmissionFactorsPdfDocument(snapshot);
    const headings = document.sections.filter(section => section.type === 'heading');
    expect(headings.filter(section => section.bookmarkLevel === 0).map(section => section.title))
      .toEqual(snapshot.results.map(result => result.facility.name));
    expect(headings.filter(section => section.bookmarkLevel === 0).map(section => section.pageBreakBefore)).toEqual([false, true, true]);
    expect(headings.filter(section => section.bookmarkLevel === 1).map(section => section.title))
      .toEqual(['Electricity Emission Factors', 'Other Emission Factors', 'Other Emission Factors']);
    for (const result of snapshot.results) {
      expect(headings.filter(section => section.title === result.facility.name)).toHaveLength(1);
    }
    const tables = document.sections.filter((section): section is TableSection => section.type === 'table');
    expect(tables).toHaveLength(3);
    expect(tables).toEqual(snapshot.results.flatMap(result => emissionFactorsPdfSections(result).filter(section => section.type === 'table')));
    expect(headings.find(section => section.title?.endsWith('Other Emission Factors'))?.pageBreakBefore).toBe(true);
    expect(JSON.stringify(document.sections)).toContain('no meters with applicable emission factors');
    expect(snapshot).toEqual(before);
  });
});
